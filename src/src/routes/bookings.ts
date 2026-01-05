import { Router } from 'express';
import { bookingModel } from '../models/Booking.js';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';
import { userStatsModel } from '../models/UserStats.js';

const router = Router();

// 获取用户信息（用于权限检查）
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

// 创建预约（需要登录）
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    if (user.role !== 'client') {
      return res.status(403).json({ error: '只有客户可以创建预约' });
    }
    
    const { profileId, serviceType, bookingDate, bookingTime, location, notes } = req.body;
    
    if (!profileId || !bookingDate || !bookingTime) {
      return res.status(400).json({ error: '请提供必要的预约信息' });
    }
    
    // 获取profile的providerId（如果有）
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: '茶茶檔案不存在' });
    }
    
    // 如果profile有userId字段，使用它作为providerId（特選魚市）
    const providerId = profile.userId || undefined;
    
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
    
    // 返回预约信息，包括对方的联络方式（如果已预约）
    const bookingResponse: any = { ...booking };
    
    // 如果是特選魚市（有providerId），返回佳麗的聯絡方式
    if (providerId && profile.contactInfo) {
      bookingResponse.providerContactInfo = profile.contactInfo;
    }
    
    res.status(201).json(bookingResponse);
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: error.message || '创建预约失败' });
  }
});

// 获取我的预约（Provider或Client）
router.get('/my', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    let bookings;
    if (user.role === 'provider') {
      bookings = await bookingModel.getByProviderId(user.id);
    } else {
      bookings = await bookingModel.getByClientId(user.id);
    }
    
    res.json(bookings);
  } catch (error: any) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ error: error.message || '获取预约失败' });
  }
});

// 获取所有预约（管理员）
router.get('/all', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const bookings = await bookingModel.getAll();
    res.json(bookings);
  } catch (error: any) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: error.message || '获取预约失败' });
  }
});

// 更新预约状态
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
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
      return res.status(403).json({ error: '無权修改此預約' });
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
      } else if (user.role === 'client' && booking.clientId === user.id) {
        // 茶客更新狀態，通知佳麗（如果有）
        if (booking.providerId) {
          const clientName = user.userName || user.email || user.phoneNumber || '茶客';
          
          if (status === 'cancelled') {
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
    res.status(500).json({ error: error.message || '更新预约失败' });
  }
});

// 删除预约
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const success = await bookingModel.delete(id, user.id, user.role);
    
    if (!success) {
      return res.status(403).json({ error: '无权删除此预约' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: error.message || '删除预约失败' });
  }
});

// 更新评论状态
router.put('/:id/review-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed } = req.body;
    
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const booking = await bookingModel.getById(id);
    if (!booking) {
      return res.status(404).json({ error: '預約不存在' });
    }
    
    // 检查权限
    if (user.role === 'client' && booking.clientId !== user.id) {
      return res.status(403).json({ error: '無权修改此預約' });
    }
    if (user.role === 'provider' && booking.providerId !== user.id) {
      return res.status(403).json({ error: '無权修改此預約' });
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

// 获取预约详情（包括对方联络方式）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const booking = await bookingModel.getById(id);
    if (!booking) {
      return res.status(404).json({ error: '預約不存在' });
    }
    
    // 检查权限
    if (user.role !== 'admin') {
      if (user.role === 'client' && booking.clientId !== user.id) {
        return res.status(403).json({ error: '無权查看此預約' });
      }
      if (user.role === 'provider' && booking.providerId !== user.id) {
        return res.status(403).json({ error: '無权查看此預約' });
      }
    }
    
    // 获取profile信息
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(booking.profileId);
    
    // 获取对方信息
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
    res.status(500).json({ error: error.message || '获取预约详情失败' });
  }
});

export default router;

