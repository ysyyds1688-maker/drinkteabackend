import { Router } from 'express';
import { reportModel } from '../models/Report.js';
import { userModel } from '../models/User.js';
import { verifyToken } from '../services/authService.js';
import { query } from '../db/database.js';

const router = Router();

// 獲取當前用戶（用於權限檢查）
const getUserFromRequest = async (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  return await userModel.findById(payload.userId);
};

// 創建檢舉記錄（支持雙向檢舉：佳麗檢舉茶客，茶客檢舉佳麗）
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const { targetUserId, bookingId, reportType, reason, description, attachments, dialogueHistory } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: '請提供被檢舉人ID' });
    }
    
    // 檢查被檢舉人是否存在
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: '被檢舉人不存在' });
    }
    
    // 確定檢舉類型的有效值（根據檢舉人角色）
    let validReportTypes: string[];
    if (user.role === 'provider') {
      // 佳麗檢舉茶客
      validReportTypes = ['solicitation', 'scam', 'harassment', 'no_show', 'other'];
    } else if (user.role === 'client') {
      // 茶客檢舉佳麗
      validReportTypes = ['not_real_person', 'scam', 'service_mismatch', 'fake_profile', 'harassment', 'other'];
    } else {
      return res.status(403).json({ error: '只有佳麗或茶客可以檢舉' });
    }
    
    if (!reportType || !validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: `請提供有效的檢舉類型。${user.role === 'provider' ? '佳麗可檢舉：招攬、詐騙、騷擾、失約、其他' : '茶客可檢舉：非本人、詐騙、服務不符、假檔案、騷擾、其他'}` });
    }
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: '請提供檢舉原因' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ error: '請提供詳細描述' });
    }
    
    // 如果提供了預約ID，驗證該預約確實存在且屬於檢舉人和被檢舉人
    if (bookingId) {
      const { bookingModel } = await import('../models/Booking.js');
      const booking = await bookingModel.getById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: '預約記錄不存在' });
      }
      
      // 根據角色驗證預約關係
      if (user.role === 'provider') {
        // 佳麗檢舉茶客：驗證 providerId 和 clientId
        if (booking.providerId !== user.id || booking.clientId !== targetUserId) {
          return res.status(403).json({ error: '該預約記錄與檢舉信息不匹配' });
        }
      } else if (user.role === 'client') {
        // 茶客檢舉佳麗：驗證 clientId 和 providerId
        if (booking.clientId !== user.id || booking.providerId !== targetUserId) {
          return res.status(403).json({ error: '該預約記錄與檢舉信息不匹配' });
        }
      }
    }
    
    // 防範亂檢舉機制
    // 1. 檢查是否在24小時內重複檢舉同一目標
    const recentDuplicate = await reportModel.checkRecentDuplicateReport(user.id, targetUserId, 24);
    if (recentDuplicate) {
      return res.status(403).json({ 
        error: `您在24小時內已對該用戶提交過檢舉（檢舉時間：${new Date(recentDuplicate.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}），請勿重複檢舉。如有新證據，請在原有檢舉記錄中補充說明。`,
        existingReportId: recentDuplicate.id
      });
    }
    
    // 2. 檢查是否在1小時內檢舉次數過多（防止短時間內大量檢舉）
    const recentReportCount = await reportModel.getRecentReportCount(user.id, 1);
    if (recentReportCount >= 5) {
      return res.status(403).json({ 
        error: `您在1小時內已提交 ${recentReportCount} 次檢舉，為防止濫用檢舉功能，請稍後再試。`,
        limitType: 'frequency',
        currentCount: recentReportCount,
        maxCount: 5,
        retryAfter: '1小時'
      });
    }
    
    // 創建檢舉記錄
    // 確保 targetRole 只允許 'client' 或 'provider'，排除 'admin'
    // 注意：user.role 在前面已經被驗證為 'provider' 或 'client'，所以不需要檢查 'admin'
    const targetRole = (targetUser.role === 'provider' || targetUser.role === 'client') ? targetUser.role : undefined;
    const reporterRole = user.role as 'provider' | 'client';
    
    const report = await reportModel.create({
      reporterId: user.id,
      targetUserId,
      reporterRole: reporterRole,
      targetRole: targetRole,
      bookingId,
      reportType,
      reason: reason.trim(),
      description: description.trim(),
      attachments: attachments || undefined,
      dialogueHistory: dialogueHistory || undefined,
    });
    
    // 如果是茶客檢舉佳麗，更新佳麗的檢舉計數並檢查是否需要凍結
    if (user.role === 'client' && targetUser.role === 'provider') {
      try {
        // 更新佳麗的檢舉計數
        const reportCounts = await userModel.incrementProviderReportCount(
          targetUserId,
          reportType as 'scam' | 'not_real_person' | 'fake_profile' | 'other'
        );
        
        // 檢查是否需要自動凍結
        const { providerRestrictionModel, calculateProviderViolationLevel } = await import('../models/ProviderRestriction.js');
        const currentProvider = await userModel.findById(targetUserId);
        
        if (currentProvider) {
          const previousViolationLevel = currentProvider.providerViolationLevel || 0;
          
          // 檢查嚴重違規：3次以上「非本人」或「詐騙」檢舉，5次以上「假檔案」檢舉
          const shouldPermanentFreeze = 
            (reportCounts.notRealPersonCount >= 3) ||
            (reportCounts.scamCount >= 3) ||
            (reportCounts.fakeProfileCount >= 5);
          
          if (shouldPermanentFreeze) {
            // 嚴重違規：永久凍結
            const existingRestriction = await providerRestrictionModel.getActiveByUserId(targetUserId);
            if (!existingRestriction) {
              const restriction = await providerRestrictionModel.create({
                userId: targetUserId,
                restrictionType: 'severe_violation',
                reason: reportCounts.notRealPersonCount >= 3 
                  ? '非本人檢舉次數已達 3 次'
                  : reportCounts.scamCount >= 3
                  ? '詐騙檢舉次數已達 3 次'
                  : '假檔案檢舉次數已達 5 次',
                reportCount: reportCounts.totalCount,
                scamReportCount: reportCounts.scamCount,
                notRealPersonCount: reportCounts.notRealPersonCount,
                fakeProfileCount: reportCounts.fakeProfileCount,
                violationLevel: 4,
              });
              
              // 更新用戶的違規級別和凍結狀態
              await userModel.updateProviderViolationLevel(targetUserId, 4, true);
              await query(`
                UPDATE users 
                SET provider_frozen = TRUE,
                    provider_frozen_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
              `, [targetUserId]);
              
              // 發送凍結通知給佳麗
              const { notificationModel } = await import('../models/Notification.js');
              await notificationModel.create({
                userId: targetUserId,
                type: 'warning',
                title: '帳號已被永久凍結',
                content: `您的帳號因嚴重違規已被永久凍結，驅逐出御茶室。原因：${restriction.reason}。您將無法接受預約、更新檔案或在論壇發文。如有疑問，請聯繫客服。`,
                link: `/user-profile`,
                metadata: {
                  type: 'provider_frozen',
                  restrictionId: restriction.id,
                  violationLevel: 4,
                },
              });
            }
          } else if (reportCounts.totalCount >= 3) {
            // 檢查是否需要根據檢舉次數凍結
            const violationLevel = calculateProviderViolationLevel(
              reportCounts.totalCount,
              previousViolationLevel
            );
            
            if (violationLevel > 0) {
              const existingRestriction = await providerRestrictionModel.getActiveByUserId(targetUserId);
              if (!existingRestriction) {
                const restriction = await providerRestrictionModel.create({
                  userId: targetUserId,
                  restrictionType: 'report_limit',
                  reason: `檢舉次數已達 ${reportCounts.totalCount} 次`,
                  reportCount: reportCounts.totalCount,
                  scamReportCount: reportCounts.scamCount,
                  notRealPersonCount: reportCounts.notRealPersonCount,
                  fakeProfileCount: reportCounts.fakeProfileCount,
                  violationLevel,
                });
                
                // 更新用戶的違規級別和標記
                let warningBadge = false;
                if (violationLevel >= 2) {
                  warningBadge = true;
                }
                await userModel.updateProviderViolationLevel(targetUserId, violationLevel, warningBadge);
                
                // 更新 users 表的凍結狀態
                await query(`
                  UPDATE users 
                  SET provider_frozen = TRUE,
                      provider_frozen_at = CURRENT_TIMESTAMP,
                      provider_auto_unfreeze_at = $1,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = $2
                `, [restriction.autoUnfreezeAt || null, targetUserId]);
                
                // 發送凍結通知給佳麗
                const { notificationModel } = await import('../models/Notification.js');
                const freezeDuration = violationLevel === 4 ? '永久' :
                                      violationLevel === 3 ? '1年' :
                                      violationLevel === 2 ? '6個月' : '1個月';
                const unfreezeDate = restriction.autoUnfreezeAt 
                  ? new Date(restriction.autoUnfreezeAt).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
                  : '';
                
                await notificationModel.create({
                  userId: targetUserId,
                  type: 'warning',
                  title: '帳號已被凍結',
                  content: `您的帳號因檢舉次數過多已被凍結。原因：檢舉次數已達 ${reportCounts.totalCount} 次。凍結期限：${freezeDuration}${unfreezeDate ? `（預計解凍時間：${unfreezeDate}）` : ''}。凍結期間您將無法接受新預約、更新檔案或在論壇發文。${violationLevel >= 2 ? '您的帳號已標記為警示戶頭。' : ''}`,
                  link: `/user-profile`,
                  metadata: {
                    type: 'provider_frozen',
                    restrictionId: restriction.id,
                    violationLevel,
                    count: reportCounts.totalCount,
                  },
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('處理佳麗檢舉計數失敗:', error);
        // 不阻止檢舉提交，只記錄錯誤
      }
    }
    
    // 發送通知給管理員
    try {
      const { notificationModel } = await import('../models/Notification.js');
      console.log(`檢舉記錄已創建: ${report.id}，檢舉人: ${user.id} (${user.role})，被檢舉人: ${targetUserId} (${targetUser.role})`);
    } catch (error) {
      console.error('發送檢舉通知失敗:', error);
    }
    
    res.status(201).json({
      message: '檢舉記錄已提交，管理員將盡快處理',
      report,
    });
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ error: error.message || '提交檢舉失敗' });
  }
});

// 獲取檢舉人的所有檢舉記錄（支持佳麗和茶客）
router.get('/my', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    // 佳麗和茶客都可以查看自己的檢舉記錄
    if (user.role !== 'provider' && user.role !== 'client') {
      return res.status(403).json({ error: '只有佳麗或茶客可以查看檢舉記錄' });
    }
    
    const reports = await reportModel.getByReporterId(user.id);
    
    res.json({ reports });
  } catch (error: any) {
    console.error('Get my reports error:', error);
    res.status(500).json({ error: error.message || '獲取檢舉記錄失敗' });
  }
});

// 獲取單個檢舉記錄詳情
router.get('/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const { id } = req.params;
    const report = await reportModel.getById(id);
    
    if (!report) {
      return res.status(404).json({ error: '檢舉記錄不存在' });
    }
    
    // 只有檢舉人、被檢舉人或管理員可以查看
    if (report.reporterId !== user.id && report.targetUserId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: '無權查看此檢舉記錄' });
    }
    
    res.json(report);
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ error: error.message || '獲取檢舉記錄失敗' });
  }
});

// 管理員：獲取所有檢舉記錄
router.get('/admin/all', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '只有管理員可以查看所有檢舉記錄' });
    }
    
    const { status, limit, offset } = req.query;
    const result = await reportModel.getAll(
      status as string | undefined,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Get all reports error:', error);
    res.status(500).json({ error: error.message || '獲取檢舉記錄失敗' });
  }
});

// 管理員：更新檢舉狀態
router.put('/:id/status', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '只有管理員可以更新檢舉狀態' });
    }
    
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!status || !['pending', 'reviewing', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '請提供有效的狀態' });
    }
    
    const updatedReport = await reportModel.updateStatus(id, status, adminNotes, user.id);
    
    if (!updatedReport) {
      return res.status(404).json({ error: '檢舉記錄不存在' });
    }
    
    // 如果狀態為 resolved 或 rejected，發送通知給檢舉人
    if (status === 'resolved' || status === 'rejected') {
      try {
        const { notificationModel } = await import('../models/Notification.js');
        await notificationModel.create({
          userId: updatedReport.reporterId,
          type: 'system',
          title: `檢舉處理完成`,
          content: `您的檢舉記錄（${updatedReport.reason}）已${status === 'resolved' ? '處理完成' : '被駁回'}。${adminNotes ? `管理員備註：${adminNotes}` : ''}`,
          link: `/user-profile?tab=reports`,
          metadata: {
            reportId: id,
            status,
          },
        });
      } catch (error) {
        console.error('發送檢舉處理通知失敗:', error);
      }
    }
    
    res.json({
      message: '檢舉狀態已更新',
      report: updatedReport,
    });
  } catch (error: any) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: error.message || '更新檢舉狀態失敗' });
  }
});

export default router;


