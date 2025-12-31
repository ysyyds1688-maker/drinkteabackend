import { Router } from 'express';
import { reviewModel } from '../models/Review.js';
import { userModel } from '../models/User.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 获取用户状态（用于评论权限控制）
const getUserStatus = async (req: any): Promise<'guest' | 'logged_in' | 'subscribed'> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 'guest';
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return 'guest';
  }
  
  const user = await userModel.findById(payload.userId);
  if (!user) {
    return 'guest';
  }
  
  // 检查订阅状态（非免费会员且未过期）
  if (user.membershipLevel !== 'tea_guest') {
    // 检查是否过期
    if (user.membershipExpiresAt) {
      const expiresAt = new Date(user.membershipExpiresAt);
      if (expiresAt > new Date()) {
        return 'subscribed';
      }
    } else {
      // 如果没有到期时间，视为永久订阅
      return 'subscribed';
    }
  }
  
  return 'logged_in';
};

// 获取评论（根据用户权限返回不同数量）
router.get('/profiles/:profileId/reviews', async (req, res) => {
  try {
    const { profileId } = req.params;
    const userStatus = await getUserStatus(req);
    
    // 获取用户ID（如果已登录）
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }
    
    // 获取所有评论
    const allReviews = await reviewModel.getByProfileId(profileId, userId);
    
    // 根据权限返回不同数量
    let visibleReviews: typeof allReviews;
    if (userStatus === 'guest') {
      visibleReviews = [];
    } else if (userStatus === 'logged_in') {
      visibleReviews = allReviews.slice(0, 2); // 只返回2则
    } else {
      visibleReviews = allReviews; // 返回全部
    }
    
    // 获取平均评分
    const averageRating = await reviewModel.getAverageRating(profileId);
    
    res.json({
      reviews: visibleReviews,
      total: allReviews.length,
      visibleCount: visibleReviews.length,
      userStatus,
      canSeeAll: userStatus === 'subscribed',
      averageRating: Math.round(averageRating * 10) / 10, // 四舍五入到小数点后1位
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: error.message || '获取评论失败' });
  }
});

// 创建评论（需要登录）
router.post('/profiles/:profileId/reviews', async (req, res) => {
  try {
    const { profileId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const { rating, comment, serviceType, clientName, category } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须在1-5之间' });
    }
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: '请输入评论内容' });
    }
    
    const review = await reviewModel.create({
      profileId,
      clientId: payload.userId,
      clientName: clientName || undefined,
      rating,
      comment: comment.trim(),
      serviceType: serviceType || undefined,
    });
    
    // 根據 profile 類型自動判斷 category（如果前端沒有傳遞）
    // 獲取 profile 信息來判斷是嚴選好茶還是特選魚市
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(profileId);
    
    // 判斷 category：嚴選好茶（userId 為空）還是特選魚市（userId 有值）
    const determinedCategory = category || (
      profile && (!profile.userId || profile.userId === null || profile.userId === '')
        ? 'premium_tea'
        : 'lady_booking'
    );
    
    // ========================================================================
    // ⚠️ 預約次數判斷機制（重要）
    // ========================================================================
    // 預約次數只在用戶發表評論時才計數，不在預約創建或狀態變更時計數。
    // 
    // 判斷標準：
    // - 特選魚市：點擊預約按鈕成功（status='accepted'或'completed'） + 評論 = 才算一次
    // - 嚴選好茶：點擊預約按鈕 + 內部管理者確認成功赴約（status='completed'） + 評論 = 才算一次
    //
    // 🔔 後續實作開放真正預約功能時，務必參考專案根目錄的「預約次數判斷機制說明.md」
    // 確保邏輯一致性，不要改變「只在評論時計數」的機制。
    // ========================================================================
    if (determinedCategory === 'premium_tea' || determinedCategory === 'lady_booking') {
      try {
        const { userStatsModel } = await import('../models/UserStats.js');
        const { achievementModel } = await import('../models/Achievement.js');
        const { bookingModel } = await import('../models/Booking.js');
        
        // 檢查該用戶是否有該 profile 的預約記錄
        const clientBookings = await bookingModel.getByClientId(payload.userId);
        const profileBooking = clientBookings.find(b => b.profileId === profileId);
        
        if (!profileBooking) {
          // 如果沒有預約記錄，不計數（評論可以發表，但不計入預約次數）
          console.log(`用戶 ${payload.userId} 評論 profile ${profileId} 但無預約記錄，不計入預約次數`);
        } else {
          if (determinedCategory === 'premium_tea') {
            // 嚴選好茶：必須是管理員確認成功赴約（status='completed'）才計數
            if (profileBooking.status === 'completed') {
              await userStatsModel.updateCounts(payload.userId, {
                premiumTeaBookingsCount: 1,
              });
              console.log(`用戶 ${payload.userId} 嚴選好茶預約計數 +1（管理員已確認赴約）`);
            } else {
              console.log(`用戶 ${payload.userId} 評論嚴選好茶但預約狀態為 ${profileBooking.status}，需等待管理員確認赴約`);
            }
          } else if (determinedCategory === 'lady_booking') {
            // 特選魚市：預約成功（status='accepted' 或 'completed'）即可計數
            if (profileBooking.status === 'accepted' || profileBooking.status === 'completed') {
              await userStatsModel.updateCounts(payload.userId, {
                ladyBookingsCount: 1,
              });
              
              // 檢查是否為重複預約同一位後宮佳麗
              const completedBookingsForSameProfile = clientBookings.filter(
                b => b.profileId === profileId && 
                     (b.status === 'accepted' || b.status === 'completed') &&
                     b.id !== profileBooking.id
              );
              
              if (completedBookingsForSameProfile.length > 0) {
                // 如果這是重複預約，增加重複預約計數
                await userStatsModel.updateCounts(payload.userId, {
                  repeatLadyBookingsCount: 1,
                });
                console.log(`用戶 ${payload.userId} 重複預約特選魚市計數 +1`);
              }
              
              console.log(`用戶 ${payload.userId} 特選魚市預約計數 +1（預約已成功）`);
            } else {
              console.log(`用戶 ${payload.userId} 評論特選魚市但預約狀態為 ${profileBooking.status}，需等待預約成功`);
            }
          }
          
          // 檢查並解鎖成就（只有在計數後才檢查）
          const stats = await userStatsModel.getOrCreate(payload.userId);
          if ((determinedCategory === 'premium_tea' && profileBooking.status === 'completed') ||
              (determinedCategory === 'lady_booking' && (profileBooking.status === 'accepted' || profileBooking.status === 'completed'))) {
              const unlocked = await achievementModel.checkAndUnlockAchievements(payload.userId);
              if (unlocked.length > 0) {
                console.log(`用戶 ${payload.userId} 解鎖了 ${unlocked.length} 個成就:`, unlocked.map(a => a.achievementName));
              }
              
              // 如果是後宮佳麗的評價，檢查並自動解鎖佳麗的成就
              if (profile && profile.userId) {
                const providerUnlocked = await achievementModel.checkAndUnlockAchievements(profile.userId);
                if (providerUnlocked.length > 0) {
                  console.log(`後宮佳麗 ${profile.userId} 自動解鎖了 ${providerUnlocked.length} 個成就:`, providerUnlocked.map(a => a.achievementName));
                }
              }
            
            // 更新每日任務進度
            const { tasksModel } = await import('../models/Tasks.js');
            try {
              if (determinedCategory === 'premium_tea' && profileBooking.status === 'completed') {
                // 預約高級茶任務
                const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'book_premium_tea', 1);
                if (taskResult.completed) {
                  await userStatsModel.addPoints(payload.userId, taskResult.pointsEarned, taskResult.experienceEarned);
                  console.log(`用戶 ${payload.userId} 完成「預約高級茶」任務，獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值`);
                  
                  // 創建任務完成通知
                  try {
                    const { notificationModel } = await import('../models/Notification.js');
                    const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'book_premium_tea');
                    if (definition) {
                      await notificationModel.create({
                        userId: payload.userId,
                        type: 'task',
                        title: '任務完成',
                        content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
                        link: `/user-profile?tab=points`,
                        metadata: {
                          taskType: 'book_premium_tea',
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
              } else if (determinedCategory === 'lady_booking' && (profileBooking.status === 'accepted' || profileBooking.status === 'completed')) {
                // 預約後宮佳麗任務
                const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'book_lady_booking', 1);
                if (taskResult.completed) {
                  await userStatsModel.addPoints(payload.userId, taskResult.pointsEarned, taskResult.experienceEarned);
                  console.log(`用戶 ${payload.userId} 完成「預約後宮佳麗」任務，獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值`);
                  
                  // 創建任務完成通知
                  try {
                    const { notificationModel } = await import('../models/Notification.js');
                    const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'book_lady_booking');
                    if (definition) {
                      await notificationModel.create({
                        userId: payload.userId,
                        type: 'task',
                        title: '任務完成',
                        content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
                        link: `/user-profile?tab=points`,
                        metadata: {
                          taskType: 'book_lady_booking',
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
              }
            } catch (taskError) {
              console.error('更新任務進度失敗:', taskError);
              // 不影響評論創建，只記錄錯誤
            }
          }
        }
      } catch (error) {
        console.error('更新統計或檢查成就失敗:', error);
        // 不影響評論創建，只記錄錯誤
      }
    }
    
    res.status(201).json(review);
  } catch (error: any) {
    console.error('Create review error:', error);
    res.status(500).json({ error: error.message || '创建评论失败' });
  }
});

// 更新评论（仅限自己的）
router.put('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const { rating, comment, serviceType } = req.body;
    const updateData: any = {};
    
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    
    const review = await reviewModel.update(reviewId, payload.userId, updateData);
    
    if (!review) {
      return res.status(403).json({ error: '无权修改此评论' });
    }
    
    res.json(review);
  } catch (error: any) {
    console.error('Update review error:', error);
    res.status(500).json({ error: error.message || '更新评论失败' });
  }
});

// 删除评论（仅限自己的）
router.delete('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const success = await reviewModel.delete(reviewId, payload.userId);
    
    if (!success) {
      return res.status(403).json({ error: '无权删除此评论' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: error.message || '删除评论失败' });
  }
});

// 点赞/取消点赞评论
router.post('/reviews/:reviewId/like', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const liked = await reviewModel.toggleLike(reviewId, payload.userId);
    
    res.json({ liked });
  } catch (error: any) {
    console.error('Like review error:', error);
    res.status(500).json({ error: error.message || '点赞失败' });
  }
});

// 回复评论（Provider 或 Admin）
router.post('/reviews/:reviewId/reply', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
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
    
    // 只有 provider 或 admin 可以回复
    if (user.role !== 'provider' && user.role !== 'admin') {
      return res.status(403).json({ error: '无权回复评论' });
    }
    
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '请输入回复内容' });
    }
    
    const replyType = user.role === 'admin' ? 'admin' : 'provider';
    const reply = await reviewModel.addReply(reviewId, replyType, payload.userId, content.trim());
    
    res.status(201).json(reply);
  } catch (error: any) {
    console.error('Reply review error:', error);
    res.status(500).json({ error: error.message || '回复失败' });
  }
});

export default router;

