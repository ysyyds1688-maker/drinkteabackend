import { Router } from 'express';
import { userModel } from '../models/User.js';
import { subscriptionModel } from '../models/Subscription.js';
import { userStatsModel } from '../models/UserStats.js';
import { achievementModel, ACHIEVEMENT_DEFINITIONS, LADY_ACHIEVEMENT_DEFINITIONS } from '../models/Achievement.js';
import { badgeModel } from '../models/Badge.js';
import { tasksModel } from '../models/Tasks.js';
import { generateTokens, verifyToken } from '../services/authService.js';

const router = Router();

// 存储邮箱验证码（生产环境应使用 Redis）
const emailVerificationCodes = new Map<string, { code: string; expiresAt: number }>();
// 存储手机验证码（生产环境应使用 Redis）
const phoneVerificationCodes = new Map<string, { code: string; expiresAt: number }>();

// 生成6位数字验证码
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
    
    // 更新每日登入任務（註冊時也視為登入）
    try {
      const taskResult = await tasksModel.updateTaskProgress(user.id, 'daily_login');
      if (taskResult.completed && taskResult.pointsEarned > 0) {
        // 任務完成，添加積分和經驗值
        await userStatsModel.addPoints(
          user.id,
          taskResult.pointsEarned,
          taskResult.experienceEarned
        );
        console.log(`用戶 ${user.id} 完成每日登入任務，獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值`);
        
        // 創建任務完成通知
        try {
          const { notificationModel } = await import('../models/Notification.js');
          const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'daily_login');
          if (definition) {
            await notificationModel.create({
              userId: user.id,
              type: 'task',
              title: '任務完成',
              content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
              link: `/user-profile?tab=points`,
              metadata: {
                taskType: 'daily_login',
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
      console.error('更新每日登入任務失敗:', error);
    }
    
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
    
    // 更新連續登入天數
    try {
      await userStatsModel.updateLoginStreak(user.id);
    } catch (error) {
      console.error('更新連續登入天數失敗:', error);
    }
    
    // 更新每日登入任務
    try {
      const taskResult = await tasksModel.updateTaskProgress(user.id, 'daily_login');
      if (taskResult.completed && taskResult.pointsEarned > 0) {
        // 任務完成，添加積分和經驗值
        await userStatsModel.addPoints(
          user.id,
          taskResult.pointsEarned,
          taskResult.experienceEarned
        );
        console.log(`用戶 ${user.id} 完成每日登入任務，獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值`);
        
        // 創建任務完成通知
        try {
          const { notificationModel } = await import('../models/Notification.js');
          const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'daily_login');
          if (definition) {
            await notificationModel.create({
              userId: user.id,
              type: 'task',
              title: '任務完成',
              content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
              link: `/user-profile?tab=points`,
              metadata: {
                taskType: 'daily_login',
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
      // 任務更新失敗不影響登入流程
      console.error('更新每日登入任務失敗:', error);
    }
    
    // 檢查並解鎖忠誠成就（守席之人、老茶客、茶王舊識）
    try {
      const unlocked = await achievementModel.checkAndUnlockAchievements(user.id);
      if (unlocked.length > 0) {
        console.log(`用戶 ${user.id} 登入時解鎖了 ${unlocked.length} 個成就`);
      }
    } catch (error) {
      console.error('檢查成就失敗:', error);
    }
    
    // 獲取用戶統計並計算正確的等級
    const stats = await userStatsModel.getOrCreate(user.id);
    const { getLevelFromExperience } = await import('../models/UserStats.js');
    const calculatedLevel = await getLevelFromExperience(user.id, stats.experiencePoints);
    
    // 如果計算出的等級與用戶表中的等級不一致，更新用戶表
    if (calculatedLevel !== user.membershipLevel) {
      await userModel.updateMembership(user.id, calculatedLevel as any, undefined);
      user.membershipLevel = calculatedLevel as any;
    }
    
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
        membershipLevel: calculatedLevel,
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
    
    // 獲取用戶統計並計算正確的等級
    const stats = await userStatsModel.getOrCreate(user.id);
    const { getLevelFromExperience } = await import('../models/UserStats.js');
    const calculatedLevel = await getLevelFromExperience(user.id, stats.experiencePoints);
    
    // 如果計算出的等級與用戶表中的等級不一致，更新用戶表
    if (calculatedLevel !== user.membershipLevel) {
      await userModel.updateMembership(user.id, calculatedLevel as any, undefined);
      user.membershipLevel = calculatedLevel as any;
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

    const { userName, avatarUrl, email, phoneNumber } = req.body;
    const updateData: any = {};
    if (userName !== undefined) updateData.userName = userName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    
    const updatedUser = await userModel.update(payload.userId, updateData);
    
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
    
    // 根據經驗值和角色計算正確的等級
    const { getLevelFromExperience } = await import('../models/UserStats.js');
    const calculatedLevel = await getLevelFromExperience(userId, stats.experiencePoints);
    
    // 如果計算出的等級與用戶表中的等級不一致，更新用戶表
    if (calculatedLevel !== user.membershipLevel) {
      await userModel.updateMembership(userId, calculatedLevel as any, undefined);
      user.membershipLevel = calculatedLevel as any;
    }
    
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
      membershipLevel: calculatedLevel,
      isVip,
      currentPoints: stats.currentPoints,
      experiencePoints: stats.experiencePoints,
      postsCount: stats.postsCount,
      repliesCount: stats.repliesCount,
      likesReceived: stats.likesReceived,
      achievements: achievements.map(a => {
        // 根據用戶角色選擇正確的成就定義
        const definitions = user.role === 'provider' ? LADY_ACHIEVEMENT_DEFINITIONS : ACHIEVEMENT_DEFINITIONS;
        const definition = definitions.find(d => d.type === a.achievementType);
        return {
          id: a.id,
          achievementType: a.achievementType, // 添加 achievementType 供前端使用
          name: definition?.name || a.achievementName,
          description: definition?.description || '',
          icon: definition?.icon || '🏆',
          unlockedAt: a.unlockedAt,
        };
      }),
      badges: badges.map(b => ({
        id: b.id,
        badgeId: b.badgeId,
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

// 發送郵箱驗證碼
router.post('/send-verification-email', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    if (!user.email) {
      return res.status(400).json({ error: '用戶未綁定郵箱' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ error: '郵箱已驗證' });
    }
    
    // 生成驗證碼
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10分鐘後過期
    
    // 存儲驗證碼
    emailVerificationCodes.set(user.id, { code, expiresAt });
    
    // 發送郵件
    try {
      const { sendVerificationEmail } = await import('../services/emailService.js');
      await sendVerificationEmail(user.email, code);
    } catch (emailError: any) {
      console.error('發送郵件失敗:', emailError);
      // 如果是開發環境且未配置 SMTP，返回驗證碼供測試
      if (process.env.NODE_ENV === 'development') {
        console.log(`[開發環境] 用戶 ${user.email} 的驗證碼: ${code}`);
        res.json({ 
          message: '驗證碼已生成（開發環境，未配置 SMTP）',
          code, // 開發環境返回驗證碼
          warning: 'SMTP 未配置，郵件未實際發送'
        });
        return;
      }
      // 生產環境發送失敗則返回錯誤
      return res.status(500).json({ error: '發送驗證碼失敗，請稍後再試' });
    }
    
    res.json({ 
      message: '驗證碼已發送到您的郵箱',
      // 開發環境且已配置 SMTP 時，也返回驗證碼方便測試
      ...(process.env.NODE_ENV === 'development' ? { code } : {})
    });
  } catch (error: any) {
    console.error('Send verification email error:', error);
    res.status(500).json({ error: error.message || '發送驗證碼失敗' });
  }
});

// 驗證郵箱
router.post('/verify-email', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: '請提供驗證碼' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ error: '郵箱已驗證' });
    }
    
    // 檢查驗證碼
    const verificationData = emailVerificationCodes.get(user.id);
    if (!verificationData) {
      return res.status(400).json({ error: '驗證碼不存在或已過期，請重新發送' });
    }
    
    if (Date.now() > verificationData.expiresAt) {
      emailVerificationCodes.delete(user.id);
      return res.status(400).json({ error: '驗證碼已過期，請重新發送' });
    }
    
    if (verificationData.code !== code) {
      return res.status(400).json({ error: '驗證碼錯誤' });
    }
    
    // 驗證成功，更新用戶狀態
    await userModel.updateEmailVerified(user.id, true);
    
    // 刪除已使用的驗證碼
    emailVerificationCodes.delete(user.id);
    
    // 給用戶經驗值獎勵（+10經驗值）
    try {
      await userStatsModel.addPoints(user.id, 0, 10); // 只給經驗值，不給積分
      console.log(`用戶 ${user.id} 驗證郵箱成功，獲得 10 經驗值`);
    } catch (error) {
      console.error('給驗證郵箱經驗值失敗:', error);
    }
    
    // 獲取更新後的用戶信息
    const updatedUser = await userModel.findById(user.id);
    if (!updatedUser) {
      return res.status(500).json({ error: '獲取用戶信息失敗' });
    }
    
    res.json({ 
      message: '郵箱驗證成功',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
      },
      experienceEarned: 10,
    });
  } catch (error: any) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: error.message || '驗證郵箱失敗' });
  }
});

// 發送手機驗證碼
router.post('/send-verification-phone', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    if (!user.phoneNumber) {
      return res.status(400).json({ error: '用戶未綁定手機號碼' });
    }
    
    if (user.phoneVerified) {
      return res.status(400).json({ error: '手機號碼已驗證' });
    }
    
    // 生成驗證碼
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10分鐘後過期
    
    // 存儲驗證碼
    phoneVerificationCodes.set(user.id, { code, expiresAt });
    
    // TODO: 這裡應該發送真實的 SMS，目前先返回驗證碼（開發環境）
    // 生產環境應該移除這個返回，只返回成功消息
    if (process.env.NODE_ENV === 'development') {
      console.log(`[開發環境] 用戶 ${user.phoneNumber} 的驗證碼: ${code}`);
    }
    
    // TODO: 發送 SMS
    // await sendSMS(user.phoneNumber, `您的驗證碼是: ${code}，有效期10分鐘`);
    
    res.json({ 
      message: '驗證碼已發送',
      // 開發環境返回驗證碼，生產環境不返回
      ...(process.env.NODE_ENV === 'development' ? { code } : {})
    });
  } catch (error: any) {
    console.error('Send verification phone error:', error);
    res.status(500).json({ error: error.message || '發送驗證碼失敗' });
  }
});

// 驗證手機號碼
router.post('/verify-phone', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: '請提供驗證碼' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    if (user.phoneVerified) {
      return res.status(400).json({ error: '手機號碼已驗證' });
    }
    
    // 檢查驗證碼
    const verificationData = phoneVerificationCodes.get(user.id);
    if (!verificationData) {
      return res.status(400).json({ error: '驗證碼不存在或已過期，請重新發送' });
    }
    
    if (Date.now() > verificationData.expiresAt) {
      phoneVerificationCodes.delete(user.id);
      return res.status(400).json({ error: '驗證碼已過期，請重新發送' });
    }
    
    if (verificationData.code !== code) {
      return res.status(400).json({ error: '驗證碼錯誤' });
    }
    
    // 驗證成功，更新用戶狀態
    await userModel.updatePhoneVerified(user.id, true);
    
    // 刪除已使用的驗證碼
    phoneVerificationCodes.delete(user.id);
    
    // 給用戶經驗值獎勵（+10經驗值）
    try {
      await userStatsModel.addPoints(user.id, 0, 10); // 只給經驗值，不給積分
      console.log(`用戶 ${user.id} 驗證手機號碼成功，獲得 10 經驗值`);
    } catch (error) {
      console.error('給驗證手機號碼經驗值失敗:', error);
    }
    
    // 獲取更新後的用戶信息
    const updatedUser = await userModel.findById(user.id);
    if (!updatedUser) {
      return res.status(500).json({ error: '獲取用戶信息失敗' });
    }
    
    res.json({ 
      message: '手機號碼驗證成功',
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        phoneVerified: updatedUser.phoneVerified,
      },
      experienceEarned: 10,
    });
  } catch (error: any) {
    console.error('Verify phone error:', error);
    res.status(500).json({ error: error.message || '驗證手機號碼失敗' });
  }
});

export default router;

