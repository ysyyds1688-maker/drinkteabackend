import cron from 'node-cron';
import { query } from '../db/database.js';
import { importService } from './importService.js';
import { Profile } from '../types.js';

export const schedulerService = {
  tasks: new Map<string, cron.ScheduledTask>(),

  // 启动所有活跃的定时任务
  async startAllTasks() {
    try {
      const result = await query(
        'SELECT * FROM scheduled_tasks WHERE is_active = 1'
      );

      for (const task of result.rows) {
        this.startTask(task);
      }
      console.log(`✅ Started ${result.rows.length} scheduled tasks`);
    } catch (error: any) {
      console.error('Failed to start scheduled tasks:', error);
    }
  },

  // 启动单个任务
  startTask(task: any) {
    // 停止现有任务（如果存在）
    if (this.tasks.has(task.id)) {
      this.tasks.get(task.id)?.stop();
    }

    // 验证 cron 表达式
    if (!cron.validate(task.cron_expression)) {
      console.error(`Invalid cron expression for task ${task.id}: ${task.cron_expression}`);
      return;
    }

    // 创建新任务
    const cronTask = cron.schedule(task.cron_expression, async () => {
      try {
        await this.executeTask(task);
      } catch (error: any) {
        console.error(`Task ${task.id} execution failed:`, error);
        await query(
          `UPDATE scheduled_tasks SET error_message = $1 WHERE id = $2`,
          [error.message, task.id]
        );
      }
    });

    this.tasks.set(task.id, cronTask);
    console.log(`✅ Scheduled task "${task.name}" started with cron: ${task.cron_expression}`);
  },

  // 执行任务
  async executeTask(task: any) {
    const config = JSON.parse(task.config || '{}');
    
    try {
      // 更新任务状态
      await query(
        `UPDATE scheduled_tasks 
         SET last_run = CURRENT_TIMESTAMP, 
             run_count = run_count + 1,
             error_message = NULL
         WHERE id = $1`,
        [task.id]
      );

      switch (task.task_type) {
        case 'import':
          // 从配置的数据源导入
          if (config.source === 'api') {
            // 调用外部 API 获取数据
            const response = await fetch(config.apiUrl, {
              headers: config.headers || {}
            });
            
            if (!response.ok) {
              throw new Error(`API request failed: ${response.statusText}`);
            }
            
            const data = await response.json() as any;
            
            // 解析并导入
            let profiles: Partial<Profile>[] = [];
            if (config.format === 'line') {
              if (data.message) {
                // 尝试使用 Gemini API 解析
                try {
                  const geminiRes = await fetch(process.env.API_BASE_URL || 'http://localhost:3001/api/gemini/parse-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: data.message })
                  });
                  
                  if (geminiRes.ok) {
                    const parsedProfile = await geminiRes.json() as Partial<Profile>;
                    profiles.push(parsedProfile);
                  }
                } catch (e) {
                  console.error('Failed to parse with Gemini:', e);
                }
              }
            } else if (config.format === 'telegram') {
              profiles = importService.parseTelegramMessage(data);
            } else if (config.format === 'csv') {
              if (typeof data === 'string') {
                profiles = importService.parseCSV(data);
              }
            } else {
              profiles = Array.isArray(data.profiles) ? (data.profiles as Partial<Profile>[]) : [];
            }

            if (profiles.length > 0) {
              await importService.importProfiles(profiles, {
                autoApprove: config.autoApprove !== false,
                sourceType: `scheduled:${task.task_type}`
              });
            }
          }
          break;

        case 'sync':
          // 同步任务
          // 可以添加同步逻辑
          console.log(`Executing sync task: ${task.name}`);
          break;

        case 'cleanup':
          // 清理任务
          // 可以添加清理逻辑
          console.log(`Executing cleanup task: ${task.name}`);
          break;

        case 'booking_auto_cancel':
          // 自动取消24小时内未确认的预约
          const { bookingModel } = await import('../models/Booking.js');
          const expiredBookings = await bookingModel.getPendingExpired();
          
          for (const booking of expiredBookings) {
            await bookingModel.updateStatus(booking.id, 'cancelled', 'system', 'admin');
            console.log(`自动取消预约: ${booking.id} (创建于 ${booking.createdAt})`);
          }
          
          if (expiredBookings.length > 0) {
            console.log(`✅ 自动取消了 ${expiredBookings.length} 个过期预约`);
          }
          break;

        case 'auto_unfreeze_restrictions':
          // 自動解凍預約限制
          const { bookingRestrictionModel } = await import('../models/BookingRestriction.js');
          const { notificationModel } = await import('../models/Notification.js');
          
          // 執行自動解凍
          const unfrozenCount = await bookingRestrictionModel.autoUnfreeze();
          
          if (unfrozenCount > 0) {
            console.log(`✅ 自動解凍了 ${unfrozenCount} 個預約限制`);
            
            // 獲取剛解凍的記錄並發送通知
            const unfrozenRestrictions = await query(`
              SELECT * FROM booking_restrictions
              WHERE is_frozen = FALSE
                AND unfrozen_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
                AND auto_unfreeze_at IS NOT NULL
            `);
            
            for (const restriction of unfrozenRestrictions.rows) {
              await notificationModel.create({
                userId: restriction.user_id,
                type: 'info',
                title: '✅ 預約權限已解凍',
                content: `您的預約權限已自動解凍，現在可以正常預約嚴選好茶和特選魚市了。請遵守預約規則，避免再次被凍結。`,
                link: `/user-profile?tab=bookings`,
                metadata: {
                  type: 'booking_unfrozen',
                  restrictionId: restriction.id,
                },
              });
            }
          }
          
          // 檢查即將解凍的記錄（3天內），發送提醒通知
          const pendingUnfreeze = await bookingRestrictionModel.getPendingAutoUnfreeze(3);
          
          for (const restriction of pendingUnfreeze) {
            // 檢查是否已經發送過提醒（避免重複通知）
            const existingNotifications = await query(`
              SELECT COUNT(*) as count FROM notifications
              WHERE user_id = $1
                AND type = 'info'
                AND metadata->>'type' = 'booking_unfreeze_reminder'
                AND metadata->>'restrictionId' = $2
                AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day'
            `, [restriction.userId, restriction.id]);
            
            if (existingNotifications.rows[0].count === '0') {
              const unfreezeDate = restriction.autoUnfreezeAt 
                ? new Date(restriction.autoUnfreezeAt).toLocaleDateString('zh-TW')
                : '';
              
              await notificationModel.create({
                userId: restriction.userId,
                type: 'info',
                title: '📅 預約權限即將解凍',
                content: `您的預約權限將於 ${unfreezeDate} 自動解凍。解凍後請遵守預約規則，避免再次被凍結。`,
                link: `/user-profile?tab=bookings`,
                metadata: {
                  type: 'booking_unfreeze_reminder',
                  restrictionId: restriction.id,
                  unfreezeDate,
                },
              });
            }
          }
          break;
      }
    } catch (error: any) {
      await query(
        `UPDATE scheduled_tasks SET error_message = $1 WHERE id = $2`,
        [error.message, task.id]
      );
      throw error;
    }
  },

  // 停止任务
  stopTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.stop();
      this.tasks.delete(taskId);
      console.log(`Stopped task: ${taskId}`);
    }
  },

  // 停止所有任务
  stopAllTasks() {
    for (const [id, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();
    console.log('Stopped all scheduled tasks');
  }
};

