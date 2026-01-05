import { Router } from 'express';
import { userModel, MembershipLevel, LadyMembershipLevel } from '../models/User.js';
import { subscriptionModel } from '../models/Subscription.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 獲取我的訂閱狀態
router.get('/my', async (req, res) => {
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
    
    const activeSubscription = await subscriptionModel.getActiveByUserId(payload.userId);
    const isActive = user.membershipLevel !== 'tea_guest' && 
      (!user.membershipExpiresAt || new Date(user.membershipExpiresAt) > new Date());
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    res.json({
      membershipLevel: user.membershipLevel,
      membershipExpiresAt: user.membershipExpiresAt,
      verificationBadges: user.verificationBadges || [],
      isActive,
      isVip,
      activeSubscription: activeSubscription || null,
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message || '獲取訂閱狀態失敗' });
  }
});

// 訂閱（支持選擇等級）
router.post('/subscribe', async (req, res) => {
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
    
    const { membershipLevel, duration } = req.body; // membershipLevel: 'tea_scholar' | 'royal_tea_scholar' | 'royal_tea_officer' | 'tea_king_attendant', duration in days
    
    if (!membershipLevel || !['tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant', 'imperial_chief_tea_officer', 'tea_king_confidant', 'tea_king_personal_selection', 'imperial_golden_seal_tea_officer', 'national_master_tea_officer'].includes(membershipLevel)) {
      return res.status(400).json({ error: '無效的會員等級' });
    }
    
    // 檢查用戶驗證狀態（VIP 購買前需要 Email 和手機號碼驗證）
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    if (!user.emailVerified || !user.phoneVerified) {
      const missingVerifications: string[] = [];
      if (!user.emailVerified) missingVerifications.push('Email');
      if (!user.phoneVerified) missingVerifications.push('手機號碼');
      
      return res.status(400).json({ 
        error: `購買VIP前，請先完成以下驗證：${missingVerifications.join('、')}`,
        missingVerifications 
      });
    }
    
    const days = duration || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    // 創建訂閱記錄
    const subscription = await subscriptionModel.create({
      userId: payload.userId,
      membershipLevel: membershipLevel as MembershipLevel,
      expiresAt,
    });
    
    // 更新用戶會員等級
    await userModel.updateMembership(payload.userId, membershipLevel as MembershipLevel, expiresAt);
    
    res.json({
      message: '訂閱成功',
      membershipLevel: membershipLevel,
      membershipExpiresAt: expiresAt.toISOString(),
      subscription,
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message || '訂閱失敗' });
  }
});

// 獲取訂閱歷史
router.get('/history', async (req, res) => {
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
    
    const history = await subscriptionModel.getHistoryByUserId(payload.userId);
    
    res.json({
      history,
    });
  } catch (error: any) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ error: error.message || '獲取訂閱歷史失敗' });
  }
});

// 取消訂閱
router.post('/cancel', async (req, res) => {
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
    
    const activeSubscription = await subscriptionModel.getActiveByUserId(payload.userId);
    if (!activeSubscription) {
      return res.status(404).json({ error: '沒有活躍的訂閱' });
    }
    
    await subscriptionModel.cancel(activeSubscription.id);
    
    // 將用戶等級降為茶客
    await userModel.updateMembership(payload.userId, 'tea_guest');
    
    res.json({
      message: '訂閱已取消',
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || '取消訂閱失敗' });
  }
});

// 獲取等級權益列表
router.get('/benefits', async (req, res) => {
  try {
    // 嘗試從 Authorization header 獲取用戶角色
    let userRole: 'provider' | 'client' | 'admin' = 'client'; // 默認為品茶客
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
          const user = await userModel.findById(payload.userId);
          if (user) {
            userRole = user.role;
          }
        }
      }
    } catch (e) {
      // 如果獲取用戶信息失敗，使用默認值（品茶客）
      console.log('無法獲取用戶角色，使用默認值（品茶客）');
    }

    let benefits: Array<{ level: string; benefits: string[] }> = [];
    
    if (userRole === 'provider') {
      // 後宮佳麗等級權益
      const ladyLevels: Array<'lady_trainee' | 'lady_apprentice' | 'lady_junior' | 'lady_senior' | 'lady_expert' | 'lady_master' | 'lady_elite' | 'lady_premium' | 'lady_royal' | 'lady_empress'> = [
        'lady_trainee', 'lady_apprentice', 'lady_junior', 'lady_senior', 'lady_expert', 
        'lady_master', 'lady_elite', 'lady_premium', 'lady_royal', 'lady_empress'
      ];
      benefits = ladyLevels.map(level => ({
        level,
        benefits: userModel.getLadyMembershipBenefits(level),
      }));
    } else {
      // 品茶客等級權益
      const clientLevels: MembershipLevel[] = [
        'tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant', 
        'imperial_chief_tea_officer', 'tea_king_confidant', 'tea_king_personal_selection', 
        'imperial_golden_seal_tea_officer', 'national_master_tea_officer'
      ];
      benefits = clientLevels.map(level => ({
        level,
        benefits: userModel.getMembershipBenefits(level),
      }));
    }
    
    console.log(`[benefits] 返回 ${userRole} 角色的權益列表，共 ${benefits.length} 個等級`);
    res.json({
      benefits,
    });
  } catch (error: any) {
    console.error('Get benefits error:', error);
    res.status(500).json({ error: error.message || '獲取權益列表失敗' });
  }
});

export default router;

