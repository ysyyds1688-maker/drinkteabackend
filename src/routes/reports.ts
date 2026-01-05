import { Router } from 'express';
import { reportModel } from '../models/Report.js';
import { userModel } from '../models/User.js';
import { verifyToken } from '../services/authService.js';

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

// 創建檢舉記錄（佳麗檢舉茶客）
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    // 只有佳麗可以檢舉
    if (user.role !== 'provider') {
      return res.status(403).json({ error: '只有佳麗可以檢舉茶客' });
    }
    
    const { targetUserId, bookingId, reportType, reason, description, attachments, dialogueHistory } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: '請提供被檢舉人ID' });
    }
    
    if (!reportType || !['solicitation', 'scam', 'harassment', 'no_show', 'other'].includes(reportType)) {
      return res.status(400).json({ error: '請提供有效的檢舉類型' });
    }
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: '請提供檢舉原因' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ error: '請提供詳細描述' });
    }
    
    // 檢查被檢舉人是否存在
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: '被檢舉人不存在' });
    }
    
    // 如果提供了預約ID，驗證該預約確實存在且屬於檢舉人和被檢舉人
    if (bookingId) {
      const { bookingModel } = await import('../models/Booking.js');
      const booking = await bookingModel.getById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: '預約記錄不存在' });
      }
      
      if (booking.providerId !== user.id || booking.clientId !== targetUserId) {
        return res.status(403).json({ error: '該預約記錄與檢舉信息不匹配' });
      }
    }
    
    // 創建檢舉記錄
    const report = await reportModel.create({
      reporterId: user.id,
      targetUserId,
      bookingId,
      reportType,
      reason: reason.trim(),
      description: description.trim(),
      attachments: attachments || undefined,
      dialogueHistory: dialogueHistory || undefined,
    });
    
    // 發送通知給管理員（如果需要）
    try {
      const { notificationModel } = await import('../models/Notification.js');
      // 這裡可以發送通知給所有管理員，或者創建一個管理員通知系統
      console.log(`檢舉記錄已創建: ${report.id}，檢舉人: ${user.id}，被檢舉人: ${targetUserId}`);
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

// 獲取檢舉人的所有檢舉記錄
router.get('/my', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    // 只有佳麗可以查看自己的檢舉記錄
    if (user.role !== 'provider') {
      return res.status(403).json({ error: '只有佳麗可以查看檢舉記錄' });
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

