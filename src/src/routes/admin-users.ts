import { Router } from 'express';
import { userModel } from '../models/User.js';
import { bookingModel, Booking } from '../models/Booking.js';
import { verifyToken } from '../services/authService.js';

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

// 获取所有用户（管理员）
router.get('/', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const users = await userModel.getAll();
    
    // 移除密码字段
    const usersWithoutPassword = users.map(u => ({
      id: u.id,
      email: u.email,
      phoneNumber: u.phoneNumber,
      role: u.role,
      membershipLevel: u.membershipLevel,
      membershipExpiresAt: u.membershipExpiresAt,
      emailVerified: u.emailVerified,
      phoneVerified: u.phoneVerified,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
    }));
    
    res.json(usersWithoutPassword);
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: error.message || '获取用户失败' });
  }
});

// 获取用户详情（包含预约信息）
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const targetUser = await userModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取用户的预约信息
    let bookings: Booking[] = [];
    if (targetUser.role === 'provider') {
      bookings = await bookingModel.getByProviderId(userId);
    } else if (targetUser.role === 'client') {
      bookings = await bookingModel.getByClientId(userId);
    }
    
    res.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        phoneNumber: targetUser.phoneNumber,
        role: targetUser.role,
        membershipLevel: targetUser.membershipLevel,
        membershipExpiresAt: targetUser.membershipExpiresAt,
        emailVerified: targetUser.emailVerified,
        phoneVerified: targetUser.phoneVerified,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
        lastLoginAt: targetUser.lastLoginAt,
      },
      bookings,
    });
  } catch (error: any) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: error.message || '获取用户详情失败' });
  }
});

export default router;

