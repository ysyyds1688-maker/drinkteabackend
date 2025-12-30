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
    let providerId: string | undefined;
    
    // 如果profile有userId字段，使用它作为providerId
    // 这里假设profile可能关联到某个provider用户
    // 暂时设为null，后续可以扩展
    
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
    
    res.status(201).json(booking);
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
    
    // 如果預約狀態變為 'completed'，給完成預約的用戶經驗值獎勵（+25經驗值/次）
    if (status === 'completed' && existingBooking.status !== 'completed') {
      try {
        // 給客戶經驗值（如果是客戶完成的預約）
        if (user.role === 'client' && booking.clientId === user.id) {
          await userStatsModel.addPoints(booking.clientId, 0, 25); // 只給經驗值，不給積分
        }
        // 給供茶人經驗值（如果是供茶人完成的預約）
        if (user.role === 'provider' && booking.providerId === user.id) {
          await userStatsModel.addPoints(booking.providerId, 0, 25); // 只給經驗值，不給積分
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

export default router;

