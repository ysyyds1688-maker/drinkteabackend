import { Router } from 'express';
import { userModel } from '../models/User.js';
import { generateTokens, verifyToken } from '../services/authService.js';

const router = Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, phoneNumber, password, userName, role } = req.body;
    
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: '请提供 Email 或手机号' });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    
    // 检查用户是否已存在
    const existing = await userModel.findByEmailOrPhone(email, phoneNumber);
    if (existing) {
      return res.status(400).json({ error: '该 Email 或手机号已被注册' });
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
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userName: user.userName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        membershipLevel: user.membershipLevel,
      },
      ...tokens,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || '注册失败' });
  }
});

// 登录
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
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        membershipLevel: user.membershipLevel,
        membershipExpiresAt: user.membershipExpiresAt,
      },
      ...tokens,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
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
    
    res.json({
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      membershipLevel: user.membershipLevel,
      membershipExpiresAt: user.membershipExpiresAt,
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
      return res.status(401).json({ error: '未授权' });
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
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      userName: updatedUser.userName,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      membershipLevel: updatedUser.membershipLevel,
      membershipExpiresAt: updatedUser.membershipExpiresAt,
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

export default router;

