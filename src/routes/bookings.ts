import { Router } from 'express';
import { bookingModel } from '../models/Booking.js';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';
import { userStatsModel } from '../models/UserStats.js';

const router = Router();

// 獲取用戶資訊（用於權限檢查）
const getUserFromRequest = async (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  
  const user = await userModel.findById(payload.userId);
  return user;
};

// 創建預約（需要登入）
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    // 允許 client 和 admin 創建預約（管理員也可以作為茶客預約）
    if (user.role !== 'client' && user.role !== 'admin') {
      return res.status(403).json({ error: '只有茶客可以創建預約' });
    }
    
    // 檢查用戶是否被凍結
    const { bookingRestrictionModel } = await import('../models/BookingRestriction.js');
    const isFrozen = await bookingRestrictionModel.isUserFrozen(user.id);
    
    if (isFrozen) {
      const restriction = await bookingRestrictionModel.getActiveByUserId(user.id);
      const reason = restriction?.reason || '取消預約次數過多';
      return res.status(403).json({ 
        error: `您的預約權限已被凍結，原因：${reason}。請聯繫客服處理。`,
        restriction: {
          reason,
          frozenAt: restriction?.frozenAt,
          cancellationCount: restriction?.cancellationCount,
        }
      });
    }
    
    const { profileId, serviceType, bookingDate, bookingTime, location, notes } = req.body;
    
    if (!profileId || !bookingDate || !bookingTime) {
      return res.status(400).json({ error: '請提供必要的預約資訊' });
    }
    
    // 獲取 profile 的 providerId（如果有）
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: '茶茶檔案不存在' });
    }
    
    // 如果 profile 有 userId 欄位，使用它作為 providerId（特選魚市）
    const providerId = profile.userId || undefined;
    
    // 茶客保護機制：檢查佳麗是否有被檢舉的記錄
    if (providerId) {
      const { reportModel } = await import('../models/Report.js');
      
      // 檢查該佳麗是否有未解決的詐騙或招攬檢舉
      const recentReports = await reportModel.getByTargetUserId(providerId);
      const unresolvedScamReports = recentReports.filter(
        r => r.reportType === 'scam' || r.reportType === 'solicitation'
      ).filter(r => r.status === 'pending' || r.status === 'reviewing');
      
      if (unresolvedScamReports.length >= 3) {
        // 如果有3個或以上未解決的詐騙/招攬檢舉，警告茶客
        return res.status(403).json({
          error: '該佳麗有多個未解決的檢舉記錄，為保護您的權益，建議您選擇其他佳麗。如有疑問，請聯繫客服。',
          warning: true,
          reportCount: unresolvedScamReports.length,
        });
      } else if (unresolvedScamReports.length > 0) {
        // 如果有未解決的檢舉，提醒茶客
        console.log(`⚠️ 警告：佳麗 ${providerId} 有 ${unresolvedScamReports.length} 個未解決的檢舉記錄`);
      }
      
      // 檢查該佳麗是否有被永久凍結的記錄（如果有，不允許預約）
      const providerUser = await userModel.findById(providerId);
      if (providerUser && providerUser.violationLevel === 4) {
        return res.status(403).json({
          error: '該佳麗帳號已被永久除名，驅逐出御茶室，無法接受預約。',
        });
      }
    }
    
    const booking = await bookingModel.create({
      providerId,
      clientId: user.id,
      profileId,
      serviceType,
      bookingDate,
      bookingTime,
      location,
      notes,
    });
    
    // 如果是特選魚市（有providerId），給佳麗發送預約通知
    if (providerId) {
      try {
        const { notificationModel } = await import('../models/Notification.js');
        const clientName = user.userName || user.email || user.phoneNumber || '一位茶客';
        const bookingDateTime = `${bookingDate} ${bookingTime}`;
        
        await notificationModel.create({
          userId: providerId,
          type: 'booking',
          title: '新的預約請求',
          content: `${clientName} 預約了您的服務\n預約時間：${bookingDateTime}${location ? `\n地點：${location}` : ''}${notes ? `\n備註：${notes}` : ''}\n\n請在24小時內確認預約。`,
          link: `/user-profile?tab=bookings`,
          metadata: {
            bookingId: booking.id,
            clientId: user.id,
            profileId: profileId,
            bookingDate: bookingDate,
            bookingTime: bookingTime,
          },
        });
        console.log(`已發送預約通知給佳麗 ${providerId}`);
      } catch (error) {
        console.error('發送預約通知失敗:', error);
        // 不阻止預約創建，只記錄錯誤
      }
    }
    
    // 返回預約資訊，包括對方的聯絡方式（如果已預約）
    const bookingResponse: any = { ...booking };
    
    // 如果是特選魚市（有providerId），返回佳麗的聯絡方式
    if (providerId && profile.contactInfo) {
      bookingResponse.providerContactInfo = profile.contactInfo;
    }
    
    res.status(201).json(bookingResponse);
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: error.message || '創建預約失敗' });
  }
});

// 獲取我的預約（Provider、Client 或 Admin）
router.get('/my', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    let bookings;
    if (user.role === 'provider') {
      bookings = await bookingModel.getByProviderId(user.id);
    } else if (user.role === 'admin') {
      // 管理員可以查看所有預約（作為 client 視角，顯示 profile 資訊）
      bookings = await bookingModel.getByClientId(user.id);
      // 如果管理員沒有作為 client 的預約，也可以查看所有預約
      if (bookings.length === 0) {
        bookings = await bookingModel.getAll();
      }
    } else {
      bookings = await bookingModel.getByClientId(user.id);
    }
    
    res.json(bookings);
  } catch (error: any) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ error: error.message || '獲取預約失敗' });
  }
});

// GET /api/bookings/available-times/:profileId - 獲取某個 profile 在特定日期的可用時間
router.get('/available-times/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: '請提供日期參數' });
    }
    
    // 獲取 profile 信息
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: '茶茶檔案不存在' });
    }
    
    // 獲取該日期已預約的時間
    const bookedTimes = await bookingModel.getBookedTimesByProfileAndDate(profileId, date as string);
    
    // 定義所有可能的時間選項
    const allTimeSlots = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
      '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00'
    ];
    
    // 計算可用時間（排除已預約的時間）
    const availableTimes = allTimeSlots.filter(time => !bookedTimes.includes(time));
    
    res.json({
      profileId,
      date,
      availableTimes,
      bookedTimes,
      allTimeSlots,
    });
  } catch (error: any) {
    console.error('Get available times error:', error);
    res.status(500).json({ error: error.message || '獲取可用時間失敗' });
  }
});

// 獲取所有預約（管理員）
router.get('/all', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }
    
    const bookings = await bookingModel.getAll();
    res.json(bookings);
  } catch (error: any) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: error.message || '獲取預約失敗' });
  }
});

// 更新預約狀態
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }
    
    const existingBooking = await bookingModel.getById(id);
    if (!existingBooking) {
      return res.status(404).json({ error: '預約不存在' });
    }
    
    const booking = await bookingModel.updateStatus(id, status, user.id, user.role);
    
    if (!booking) {
      return res.status(403).json({ error: '無權修改此預約' });
    }
    
    // 發送狀態變更通知
    try {
      const { notificationModel } = await import('../models/Notification.js');
      const { profileModel } = await import('../models/Profile.js');
      
      if (user.role === 'provider' && booking.providerId === user.id) {
        // 佳麗更新狀態，通知茶客
        const client = await userModel.findById(booking.clientId);
        const profile = await profileModel.getById(booking.profileId);
        const clientName = client?.userName || client?.email || client?.phoneNumber || '茶客';
        const providerName = user.userName || user.email || user.phoneNumber || '佳麗';
        
        let notificationTitle = '';
        let notificationContent = '';
        
        if (status === 'accepted') {
          notificationTitle = '預約已確認';
          notificationContent = `${providerName} 已確認您的預約\n預約時間：${booking.bookingDate} ${booking.bookingTime}${booking.location ? `\n地點：${booking.location}` : ''}`;
        } else if (status === 'rejected') {
          notificationTitle = '預約已拒絕';
          notificationContent = `${providerName} 已拒絕您的預約請求`;
        } else if (status === 'completed') {
          notificationTitle = '預約已完成';
          notificationContent = `您的預約已完成，請記得給予評論！`;
        } else if (status === 'cancelled') {
          notificationTitle = '預約已取消';
          notificationContent = `${providerName} 已取消您的預約`;
        }
        
        if (notificationTitle) {
          await notificationModel.create({
            userId: booking.clientId,
            type: 'booking',
            title: notificationTitle,
            content: notificationContent,
            link: `/user-profile?tab=bookings`,
            metadata: {
              bookingId: booking.id,
              status: status,
            },
          });
        }
        
        // 更新回應預約任務進度（當佳麗接受或拒絕預約時）
        if (status === 'accepted' || status === 'rejected') {
          try {
            const { tasksModel } = await import('../models/Tasks.js');
            const taskResult = await tasksModel.updateTaskProgress(user.id, 'lady_respond_booking');
            
            if (taskResult.completed) {
              await userStatsModel.addPoints(
                user.id,
                taskResult.pointsEarned,
                taskResult.experienceEarned
              );
              
              // 創建任務完成通知
              try {
                const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_respond_booking');
                if (definition) {
                  await notificationModel.create({
                    userId: user.id,
                    type: 'task',
                    title: '任務完成',
                    content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
                    link: `/user-profile?tab=points`,
                    metadata: {
                      taskType: 'lady_respond_booking',
                      taskName: definition.name,
                      pointsEarned: taskResult.pointsEarned,
                      experienceEarned: taskResult.experienceEarned,
                    },
                  });
                }
              } catch (error) {
                console.error('創建任務完成通知失敗:', error);
              }
            }
          } catch (error) {
            console.error('更新回應預約任務失敗:', error);
          }
        }
      } else if (user.role === 'client' && booking.clientId === user.id) {
        // 茶客更新狀態，通知佳麗（如果有）
        if (booking.providerId) {
          const clientName = user.userName || user.email || user.phoneNumber || '茶客';
          
          if (status === 'cancelled') {
            // 增加茶客的取消次數
            try {
              const cancellationResult = await userModel.incrementCancellationCount(user.id);
              
              // 如果達到3次，創建凍結記錄並發送通知
              if (cancellationResult.count >= 3) {
                const { bookingRestrictionModel, calculateViolationLevel } = await import('../models/BookingRestriction.js');
                const { userModel } = await import('../models/User.js');
                
                // 檢查是否已經有凍結記錄
                const existingRestriction = await bookingRestrictionModel.getActiveByUserId(user.id);
                
                if (!existingRestriction) {
                  // 獲取用戶當前的違規級別（用於判斷累犯）
                  const currentUser = await userModel.findById(user.id);
                  const previousViolationLevel = currentUser?.violationLevel || 0;
                  
                  // 計算新的違規級別
                  const violationLevel = calculateViolationLevel(
                    cancellationResult.count,
                    'cancellation_limit',
                    previousViolationLevel
                  );
                  
                  // 創建新的凍結記錄（會自動計算凍結期限）
                  const restriction = await bookingRestrictionModel.create({
                    userId: user.id,
                    restrictionType: 'cancellation_limit',
                    reason: `取消預約次數已達 ${cancellationResult.count} 次`,
                    cancellationCount: cancellationResult.count,
                    violationLevel,
                  });
                  
                  // 更新用戶的違規級別和標記
                  let warningBadge = false;
                  if (violationLevel >= 2) {
                    // 累犯第一次（總計6次）開始顯示警示標記
                    warningBadge = true;
                  }
                  
                  await userModel.updateViolationLevel(user.id, violationLevel, warningBadge, undefined);
                  
                  // 根據違規級別發送不同的通知
                  let freezeDuration = '';
                  if (violationLevel === 1) {
                    freezeDuration = '1個月';
                  } else if (violationLevel === 2) {
                    freezeDuration = '6個月';
                  } else if (violationLevel === 3) {
                    freezeDuration = '1年';
                  } else if (violationLevel === 4) {
                    freezeDuration = '永久';
                  }
                  
                  const unfreezeDate = restriction.autoUnfreezeAt 
                    ? new Date(restriction.autoUnfreezeAt).toLocaleDateString('zh-TW')
                    : '需管理員手動解除';
                  
                  await notificationModel.create({
                    userId: user.id,
                    type: 'warning',
                    title: '⚠️ 預約權限已被凍結',
                    content: violationLevel === 4 
                      ? `您的預約權限已被凍結。原因：取消預約次數已達 ${cancellationResult.count} 次。您已被永久除名，驅逐出御茶室，將無法預約嚴選好茶和特選魚市。`
                      : `您的預約權限已被凍結。原因：取消預約次數已達 ${cancellationResult.count} 次。凍結期限：${freezeDuration}${restriction.autoUnfreezeAt ? `（預計解凍時間：${unfreezeDate}）` : ''}。您將無法預約嚴選好茶和特選魚市。${violationLevel >= 2 ? '您的帳號已標記為失信茶客。' : ''}`,
                    link: `/user-profile?tab=bookings`,
                    metadata: {
                      type: 'booking_frozen',
                      count: cancellationResult.count,
                      violationLevel,
                    },
                  });
                }
              }
            } catch (error) {
              console.error('更新取消次數失敗:', error);
            }
            
            await notificationModel.create({
              userId: booking.providerId,
              type: 'booking',
              title: '預約已取消',
              content: `${clientName} 已取消預約`,
              link: `/user-profile?tab=bookings`,
              metadata: {
                bookingId: booking.id,
                status: status,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('發送預約狀態變更通知失敗:', error);
      // 不阻止狀態更新，只記錄錯誤
    }
    
    // ========================================================================
    // ⚠️ 預約完成處理（重要：不更新預約次數統計）
    // ========================================================================
    // 當預約狀態變為 'completed' 時，只給予經驗值獎勵（+25經驗值/次）。
    // 
    // ⚠️ 注意：預約次數統計不在這裡更新，而是在用戶發表評論時才計數。
    //
    // 預約次數判斷標準（詳細說明請參考專案根目錄的「預約次數判斷機制說明.md」）：
    // - 特選魚市：預約成功（accepted/completed）+ 評論 = 計數一次
    // - 嚴選好茶：管理員確認赴約（completed）+ 評論 = 計數一次
    //
    // 🔔 後續實作時不要在這裡添加預約次數統計邏輯，保持只在評論時計數。
    // ========================================================================
    if (status === 'completed' && existingBooking.status !== 'completed') {
      try {
        // 給客戶經驗值（如果是客戶完成的預約）
        if (user.role === 'client' && booking.clientId === user.id) {
          await userStatsModel.addPoints(booking.clientId, 0, 25); // 只給經驗值，不給積分
        }
        // 給後宮佳麗經驗值並檢查自動解鎖成就（如果是供茶人完成的預約）
        if (user.role === 'provider' && booking.providerId === user.id) {
          await userStatsModel.addPoints(booking.providerId, 0, 25); // 只給經驗值，不給積分
          
          // 檢查並自動解鎖符合條件的成就
          const { achievementModel } = await import('../models/Achievement.js');
          const unlocked = await achievementModel.checkAndUnlockAchievements(booking.providerId);
          if (unlocked.length > 0) {
            console.log(`後宮佳麗 ${booking.providerId} 自動解鎖了 ${unlocked.length} 個成就:`, unlocked.map(a => a.achievementName));
          }
        }
      } catch (error) {
        console.error('給完成預約者經驗值失敗:', error);
      }
    }
    
    res.json(booking);
  } catch (error: any) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: error.message || '更新預約失敗' });
  }
});

// 刪除預約
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const success = await bookingModel.delete(id, user.id, user.role);
    
    if (!success) {
      return res.status(403).json({ error: '無權刪除此預約' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: error.message || '刪除預約失敗' });
  }
});

// 更新评论状态
router.put('/:id/review-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed } = req.body;
    
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const booking = await bookingModel.getById(id);
    if (!booking) {
      return res.status(404).json({ error: '預約不存在' });
    }
    
    // 检查权限
    if (user.role === 'client' && booking.clientId !== user.id) {
      return res.status(403).json({ error: '無權修改此預約' });
    }
    if (user.role === 'provider' && booking.providerId !== user.id) {
      return res.status(403).json({ error: '無權修改此預約' });
    }
    
    const updatedBooking = await bookingModel.updateReviewStatus(
      id,
      user.role as 'client' | 'provider',
      reviewed === true
    );
    
    res.json(updatedBooking);
  } catch (error: any) {
    console.error('Update review status error:', error);
    res.status(500).json({ error: error.message || '更新评论状态失败' });
  }
});

// 回報放鳥（佳麗回報茶客沒有到場）- 必須在 GET /:id 之前
router.post('/:id/report-no-show', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    if (user.role !== 'provider') {
      return res.status(403).json({ error: '只有佳麗可以回報失約' });
    }
    
    const booking = await bookingModel.reportNoShow(id, user.id);
    
    if (!booking) {
      return res.status(403).json({ error: '無法回報此預約為失約，請確認預約狀態和權限' });
    }
    
    // 發送通知給茶客
    try {
      const { notificationModel } = await import('../models/Notification.js');
      const client = await userModel.findById(booking.clientId);
      const clientName = client?.userName || client?.email || client?.phoneNumber || '茶客';
      const providerName = user.userName || user.email || user.phoneNumber || '佳麗';
      
      await notificationModel.create({
        userId: booking.clientId,
        type: 'warning',
          title: '⚠️ 預約失約回報',
          content: `${providerName} 回報您未到場，預約已取消。此記錄將計入您的失約次數。`,
        link: `/user-profile?tab=bookings`,
        metadata: {
          bookingId: booking.id,
          type: 'no_show',
        },
      });
      
      // 增加放鳥次數並檢查是否需要凍結
      const clientUser = await userModel.findById(booking.clientId);
      if (clientUser) {
        const noShowResult = await userModel.incrementNoShowCount(booking.clientId);
        const updatedClientUser = await userModel.findById(booking.clientId);
        
        // 發送放鳥回報通知
        await notificationModel.create({
          userId: booking.clientId,
          type: 'warning',
          title: '⚠️ 預約失約回報',
          content: `${providerName} 回報您未到場，預約已取消。此記錄將計入您的失約次數。`,
          link: `/user-profile?tab=bookings`,
          metadata: {
            bookingId: booking.id,
            type: 'no_show',
          },
        });
        
        // 如果達到3次放鳥，創建凍結記錄
        if (noShowResult.count >= 3 && updatedClientUser) {
          const { bookingRestrictionModel, calculateViolationLevel } = await import('../models/BookingRestriction.js');
          
          // 檢查是否已經有放鳥相關的凍結記錄
          const existingRestriction = await bookingRestrictionModel.getActiveByUserId(booking.clientId);
          const isNoShowRestriction = existingRestriction?.restrictionType === 'no_show';
          
          if (!existingRestriction || !isNoShowRestriction) {
            // 獲取用戶當前的違規級別（用於判斷累犯）
            const previousViolationLevel = updatedClientUser.violationLevel || 0;
            
            // 計算新的違規級別（放鳥規則）
            const violationLevel = calculateViolationLevel(
              noShowResult.count,
              'no_show',
              previousViolationLevel
            );
            
            // 創建新的凍結記錄
            const restriction = await bookingRestrictionModel.create({
              userId: booking.clientId,
              restrictionType: 'no_show',
              reason: `失約次數已達 ${noShowResult.count} 次`,
              noShowCount: noShowResult.count,
              violationLevel,
            });
            
            // 更新用戶的違規級別和放鳥標記
            let noShowBadge = false;
            if (noShowResult.count >= 3) {
              // 3次放鳥開始顯示放鳥標記
              noShowBadge = true;
            }
            
            await userModel.updateViolationLevel(booking.clientId, violationLevel, undefined, noShowBadge);
            
            // 根據違規級別發送不同的通知
            let freezeDuration = '';
            if (violationLevel === 1) {
              freezeDuration = '1個月';
            } else if (violationLevel === 2) {
              freezeDuration = '1年';
            } else if (violationLevel === 4) {
              freezeDuration = '永久';
            }
            
            const unfreezeDate = restriction.autoUnfreezeAt 
              ? new Date(restriction.autoUnfreezeAt).toLocaleDateString('zh-TW')
              : '需管理員手動解除';
            
            await notificationModel.create({
              userId: booking.clientId,
              type: 'warning',
              title: '⚠️ 預約權限已被凍結（失約）',
              content: violationLevel === 4
            ? `您的預約權限已被凍結。原因：失約次數已達 ${noShowResult.count} 次。您已被永久除名，驅逐出御茶室，將無法預約嚴選好茶和特選魚市。`
            : `您的預約權限已被凍結。原因：失約次數已達 ${noShowResult.count} 次。凍結期限：${freezeDuration}${restriction.autoUnfreezeAt ? `（預計解凍時間：${unfreezeDate}）` : ''}。您將無法預約嚴選好茶和特選魚市。您的帳號已標記為失約茶客。`,
              link: `/user-profile?tab=bookings`,
              metadata: {
                type: 'booking_frozen_no_show',
                count: noShowResult.count,
                violationLevel,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('發送失約回報通知失敗:', error);
    }
    
    res.json({ message: '已回報為失約', booking });
  } catch (error: any) {
    console.error('Report no-show error:', error);
    res.status(500).json({ error: error.message || '回報失約失敗' });
  }
});

// 獲取預約詳情（包括對方聯絡方式）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const booking = await bookingModel.getById(id);
    if (!booking) {
      return res.status(404).json({ error: '預約不存在' });
    }
    
    // 檢查權限
    if (user.role !== 'admin') {
      if (user.role === 'client' && booking.clientId !== user.id) {
        return res.status(403).json({ error: '無權查看此預約' });
      }
      if (user.role === 'provider' && booking.providerId !== user.id) {
        return res.status(403).json({ error: '無權查看此預約' });
      }
    }
    
    // 獲取 profile 資訊
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(booking.profileId);
    
    // 獲取對方資訊
    const { userModel } = await import('../models/User.js');
    let otherUser = null;
    if (user.role === 'client' && booking.providerId) {
      otherUser = await userModel.findById(booking.providerId);
    } else if (user.role === 'provider' && booking.clientId) {
      otherUser = await userModel.findById(booking.clientId);
    }
    
    const response: any = { ...booking };
    
    // 只有在有预约记录时才返回对方联络方式
    if (profile) {
      if (user.role === 'client' && booking.providerId && profile.contactInfo) {
        // 茶客查看佳麗聯絡方式
        response.providerContactInfo = profile.contactInfo;
      } else if (user.role === 'provider' && booking.clientId && otherUser) {
        // 佳麗查看茶客聯絡方式（如果有）
        response.clientContactInfo = {
          phone: otherUser.phoneNumber,
          email: otherUser.email
        };
      }
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Get booking detail error:', error);
    res.status(500).json({ error: error.message || '獲取預約詳情失敗' });
  }
});

export default router;

