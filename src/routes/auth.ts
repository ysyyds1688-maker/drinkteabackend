import { Router } from 'express';
import { userModel } from '../models/User.js';
import { subscriptionModel } from '../models/Subscription.js';
import { userStatsModel } from '../models/UserStats.js';
import { achievementModel, ACHIEVEMENT_DEFINITIONS } from '../models/Achievement.js';
import { badgeModel } from '../models/Badge.js';
import { generateTokens, verifyToken } from '../services/authService.js';

const router = Router();

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { email, phoneNumber, password, userName, role, age } = req.body;
    
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: '请提供 Email 或手机号' });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    
    // 年龄验证：必须年满18周岁
    if (!age || age < 18) {
      return res.status(400).json({ error: '未滿18周歲禁止註冊' });
    }
    
    // 检查用户是否已存在
    const existing = await userModel.findByEmailOrPhone(email, phoneNumber);
    if (existing) {
      return res.status(400).json({ error: '該 Email 或手機號已被註冊' });
    }
    
    // 创建用户
    const user = await userModel.create({ 
      email, 
      phoneNumber, 
      password, 
      role: role || 'client'
    });
    
    // 生成 Token
    const tokens = await generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email,
      phoneNumber: user.phoneNumber,
    });
    
    await userModel.updateLastLogin(user.id);
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(user.id);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userName: user.userName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        membershipLevel: user.membershipLevel,
        membershipExpiresAt: user.membershipExpiresAt,
        verificationBadges: user.verificationBadges || [],
        nicknameChangedAt: user.nicknameChangedAt,
        isVip,
      },
      ...tokens,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || '註冊失敗' });
  }
});

// 登入
router.post('/login', async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;
    
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: '请提供 Email 或手机号' });
    }
    
    if (!password) {
      return res.status(400).json({ error: '请提供密码' });
    }
    
    // 查找用户
    const user = await userModel.findByEmailOrPhone(email, phoneNumber);
    if (!user) {
      return res.status(401).json({ error: '用户不存在或密码错误' });
    }
    
    // 验证密码
    const isValid = await userModel.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: '用户不存在或密码错误' });
    }
    
    // 生成 Token
    const tokens = await generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email,
      phoneNumber: user.phoneNumber,
    });
    
    await userModel.updateLastLogin(user.id);
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(user.id);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userName: user.userName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        membershipLevel: user.membershipLevel,
        membershipExpiresAt: user.membershipExpiresAt,
        verificationBadges: user.verificationBadges || [],
        nicknameChangedAt: user.nicknameChangedAt,
        isVip,
      },
      ...tokens,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || '登入失敗' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(user.id);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    res.json({
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      membershipLevel: user.membershipLevel,
      membershipExpiresAt: user.membershipExpiresAt,
      verificationBadges: user.verificationBadges || [],
      nicknameChangedAt: user.nicknameChangedAt,
      isVip,
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: error.message || '获取用户信息失败' });
  }
});

// 更新用户信息
router.put('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }

    const { userName, avatarUrl } = req.body;
    const updatedUser = await userModel.update(payload.userId, { userName, avatarUrl });
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(updatedUser.id);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      userName: updatedUser.userName,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      membershipLevel: updatedUser.membershipLevel,
      membershipExpiresAt: updatedUser.membershipExpiresAt,
      verificationBadges: updatedUser.verificationBadges || [],
      isVip,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || '更新用户信息失败' });
  }
});

// 登出（客户端删除token即可，这里可以记录日志）
router.post('/logout', async (req, res) => {
  res.json({ message: '登出成功' });
});

// 獲取用戶詳情（公開，用於查看其他用戶資料）
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 獲取用戶基本信息
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(userId);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    // 獲取用戶統計
    const stats = await userStatsModel.getOrCreate(userId);
    
    // 獲取成就
    const achievements = await achievementModel.getUserAchievements(userId);
    
    // 獲取勳章
    const badges = await badgeModel.getUserBadges(userId);
    
    res.json({
      id: user.id,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      membershipLevel: user.membershipLevel,
      isVip,
      currentPoints: stats.currentPoints,
      experiencePoints: stats.experiencePoints,
      postsCount: stats.postsCount,
      repliesCount: stats.repliesCount,
      likesReceived: stats.likesReceived,
      achievements: achievements.map(a => {
        // 從定義中查找對應的成就信息
        const definition = ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.achievementType);
        return {
          id: a.id,
          name: definition?.name || a.achievementName,
          description: definition?.description || '',
          icon: definition?.icon || '🏆',
          unlockedAt: a.unlockedAt,
        };
      }),
      badges: badges.map(b => ({
        id: b.id,
        badgeName: b.badgeName,
        badgeIcon: b.badgeIcon,
        unlockedAt: b.unlockedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: error.message || '獲取用戶資料失敗' });
  }
});

export default router;

