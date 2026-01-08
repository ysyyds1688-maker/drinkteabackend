import { Router } from 'express';
import bcrypt from 'bcrypt';
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
    
    // 移除密码字段，添加公開 ID
    const usersWithoutPassword = users.map(u => ({
      id: u.id,
      publicId: u.publicId || u.id, // 顯示公開 ID
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
      userName: u.userName, // 如果有的話
      isBanned: u.isBanned || false, // 封禁狀態
      userTags: (u as any).userTags || [], // 用戶標記
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
        publicId: targetUser.publicId || targetUser.id, // 顯示公開 ID
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
        userName: (targetUser as any).userName, // 如果有的話
        isBanned: (targetUser as any).isBanned || false, // 封禁狀態
        violationLevel: (targetUser as any).violationLevel || 0, // 違規級別
        userTags: (targetUser as any).userTags || [], // 用戶標記
      },
      bookings,
    });
  } catch (error: any) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: error.message || '获取用户详情失败' });
  }
});

// 更新用戶信息
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }
    
    // 移除不允許更新的字段
    const { password, id, createdAt, updatedAt, lastLoginAt, ...updateData } = req.body;
    
    const updatedUser = await userModel.update(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    res.json({ message: '更新成功', user: updatedUser });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || '更新用戶失敗' });
  }
});

// 修改會員等級
router.put('/:userId/level', async (req, res) => {
  try {
    const { userId } = req.params;
    const { level } = req.body;
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }
    
    if (!level) {
      return res.status(400).json({ error: '請提供會員等級' });
    }
    
    await userModel.updateMembership(userId, level);
    
    // 重新獲取用戶以返回更新後的數據
    const updatedUser = await userModel.findById(userId);
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    res.json({ message: '會員等級已更新', user: updatedUser });
  } catch (error: any) {
    console.error('Update membership level error:', error);
    res.status(500).json({ error: error.message || '更新會員等級失敗' });
  }
});

// 封禁/解封用戶
router.post('/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }
    
    // 更新用戶封禁狀態
    const banReason = reason || '管理員封禁';
    const bannedAt = new Date().toISOString();
    const bannedBy = adminUser.id;
    
    const updatedUser = await userModel.update(userId, { 
      isBanned: true,
      banReason: banReason,
      bannedAt: bannedAt,
      bannedBy: bannedBy
    } as any); // 暫時使用 any，因為這些字段可能不在類型定義中
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    res.json({ message: '用戶已封禁', user: updatedUser });
  } catch (error: any) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: error.message || '封禁用戶失敗' });
  }
});

router.post('/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }
    
    const updatedUser = await userModel.update(userId, { 
      isBanned: false,
      banReason: undefined,
      bannedAt: undefined,
      bannedBy: undefined
    } as any); // 暫時使用 any
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    res.json({ message: '用戶已解封', user: updatedUser });
  } catch (error: any) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: error.message || '解封用戶失敗' });
  }
});

// 重置密碼
router.post('/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '密碼長度至少6位' });
    }
    
    // 直接更新密碼（使用 SQL 更新，因為 userModel.update 不允許更新密碼）
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { query } = await import('../db/database.js');
    
    const result = await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [hashedPassword, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    // 清除用戶緩存
    const { cacheService } = await import('../services/redisService.js');
    await cacheService.delete(`cache:user:${userId}`);
    
    res.json({ message: '密碼已重置' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || '重置密碼失敗' });
  }
});

export default router;

