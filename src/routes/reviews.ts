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

// 獲取特定用戶的評論（必須在 /profiles/:profileId/reviews 之前，避免路由衝突）
router.get('/users/:userId/reviews', async (req, res) => {
  try {
    let { userId } = req.params;
    
    // 解碼 URL 編碼的 userId（處理特殊字符如 #）
    try {
      userId = decodeURIComponent(userId);
    } catch (e) {
      // 如果解碼失敗，使用原始值
      console.warn('Failed to decode userId:', userId, e);
    }
    const authHeader = req.headers.authorization;
    
    // 獲取當前用戶ID（如果已登入）
    let currentUserId: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        currentUserId = payload.userId;
      }
    }
    
    // 獲取用戶信息以確定角色
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    // 獲取評論
    const reviews = await reviewModel.getByUserId(userId, user.role as 'provider' | 'client', currentUserId);
    
    // 計算平均評分
    let averageRating = 0;
    let reviewCount = reviews.length;
    
    if (user.role === 'provider') {
      // Provider: 計算所有profile的平均評分
      const { profileModel } = await import('../models/Profile.js');
      const profilesResult = await profileModel.getAll(userId);
      if (profilesResult.profiles.length > 0) {
        const profileIds = profilesResult.profiles.map(p => p.id);
        // 計算所有profile的平均評分
        let totalRating = 0;
        let count = 0;
        for (const profileId of profileIds) {
          const avg = await reviewModel.getAverageRating(profileId);
          if (avg > 0) {
            totalRating += avg;
            count++;
          }
        }
        if (count > 0) {
          averageRating = totalRating / count;
        }
      }
    } else if (user.role === 'client') {
      // Client: 計算該茶客收到的評論的平均評分（reviewType = 'client' 且 targetUserId = userId）
      const clientReviews = reviews.filter(r => r.reviewType === 'client' && r.targetUserId === userId);
      reviewCount = clientReviews.length; // 只計算茶客收到的評論數量
      if (clientReviews.length > 0) {
        const totalRating = clientReviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalRating / clientReviews.length;
      }
    }
    
    res.json({
      reviews,
      total: reviewCount,
      averageRating: Math.round(averageRating * 10) / 10,
    });
  } catch (error: any) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: error.message || '獲取用戶評論失敗' });
  }
});

// 获取评论（根据用户权限返回不同数量）
router.get('/profiles/:profileId/reviews', async (req, res) => {
  try {
    const { profileId } = req.params;
    const userStatus = await getUserStatus(req);
    
    // 获取用户ID（如果已登录）
    let userId: string | undefined;
    let userLevel: any;
    let isVip = false;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
        
        // 獲取用戶信息和VIP狀態
        const { userModel } = await import('../models/User.js');
        const user = await userModel.findById(userId);
        if (user) {
          userLevel = user.membershipLevel;
          
          // 檢查VIP狀態
          const { subscriptionModel } = await import('../models/Subscription.js');
          const activeSubscription = await subscriptionModel.getActiveByUserId(userId);
          isVip = activeSubscription !== null && 
            activeSubscription.isActive && 
            (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
        }
      }
    }
    
    // 獲取 profile 信息，判斷是嚴選好茶還是特選魚市
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(profileId);
    const isPremiumTea = !profile?.userId; // 沒有 userId 表示是嚴選好茶
    
    // 获取所有评论
    const allReviews = await reviewModel.getByProfileId(profileId, userId);
    
    // 根據等級和VIP狀態計算可查看的評論數量
    let maxReviewCount: number;
    if (userStatus === 'guest') {
      maxReviewCount = 0;
    } else {
      const { getMaxReviewCount } = await import('../utils/membershipBenefits.js');
      maxReviewCount = getMaxReviewCount(userLevel, isVip, isPremiumTea);
    }
    
    // 根據限制返回對應數量的評論
    let visibleReviews: typeof allReviews;
    if (maxReviewCount === 0) {
      visibleReviews = [];
    } else if (maxReviewCount === -1) {
      visibleReviews = allReviews; // VIP用戶可以查看全部
    } else {
      visibleReviews = allReviews.slice(0, maxReviewCount);
    }
    
    // 获取平均评分
    const averageRating = await reviewModel.getAverageRating(profileId);
    
    res.json({
      reviews: visibleReviews,
      total: allReviews.length,
      visibleCount: visibleReviews.length,
      maxReviewCount: maxReviewCount === -1 ? allReviews.length : maxReviewCount,
      userStatus,
      canSeeAll: maxReviewCount === -1,
      isVip,
      userLevel,
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
    
    // 根據 profile 類型自動判斷 category（如果前端沒有傳遞）
    // 獲取 profile 信息來判斷是嚴選好茶還是特選魚市
    const { profileModel } = await import('../models/Profile.js');
    const profile = await profileModel.getById(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // 判斷 category：嚴選好茶（userId 為空）還是特選魚市（userId 有值）
    const determinedCategory = category || (
      (!profile.userId || profile.userId === null || profile.userId === '')
        ? 'premium_tea'
        : 'lady_booking'
    );
    
    // 特選魚市：必須有預約記錄且狀態為 accepted 或 completed 才能評論
    let profileBooking = null;
    if (determinedCategory === 'lady_booking') {
      const { bookingModel } = await import('../models/Booking.js');
      const userBookings = await bookingModel.getByClientId(payload.userId);
      profileBooking = userBookings.find(b => b.profileId === profileId);
      
      if (!profileBooking) {
        return res.status(403).json({ error: '請先預約此佳麗的服務後才能評論' });
      }
      
      if (profileBooking.status !== 'accepted' && profileBooking.status !== 'completed') {
        return res.status(403).json({ error: '預約尚未確認，請等待佳麗確認預約後再評論' });
      }
    }
    
    const review = await reviewModel.create({
      profileId,
      clientId: payload.userId,
      clientName: clientName || undefined,
      rating,
      comment: comment.trim(),
      serviceType: serviceType || undefined,
    });
    
    // 更新预约的评论状态
    if (profileBooking) {
      try {
        const { bookingModel } = await import('../models/Booking.js');
        await bookingModel.updateReviewStatus(profileBooking.id, 'client', true);
      } catch (error) {
        console.error('更新预约评论状态失败:', error);
        // 不阻止评论创建，只记录错误
      }
    } else if (determinedCategory !== 'lady_booking') {
      // 嚴選好茶或其他類型，也嘗試更新預約評論狀態
      try {
        const { bookingModel } = await import('../models/Booking.js');
        const userBookings = await bookingModel.getByClientId(payload.userId);
        const booking = userBookings.find(b => b.profileId === profileId);
        if (booking) {
          await bookingModel.updateReviewStatus(booking.id, 'client', true);
        }
      } catch (error) {
        console.error('更新预约评论状态失败:', error);
        // 不阻止评论创建，只记录错误
      }
    }
    
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
            // ⚠️ 重要：只有在該預約還沒有被評論過時才計數，防止重複計數
            if (profileBooking.status === 'completed') {
              // 檢查該預約是否已經被評論過
              if (profileBooking.clientReviewed) {
                console.log(`用戶 ${payload.userId} 評論嚴選好茶但該預約已被評論過，不重複計數`);
              } else {
                await userStatsModel.updateCounts(payload.userId, {
                  premiumTeaBookingsCount: 1,
                });
                console.log(`用戶 ${payload.userId} 嚴選好茶預約計數 +1（管理員已確認赴約且首次評論）`);
              }
            } else {
              console.log(`用戶 ${payload.userId} 評論嚴選好茶但預約狀態為 ${profileBooking.status}，需等待管理員確認赴約`);
            }
          } else if (determinedCategory === 'lady_booking') {
            // 特選魚市：預約成功（status='accepted' 或 'completed'）即可計數
            // ⚠️ 重要：只有在該預約還沒有被評論過時才計數，防止重複計數
            if (profileBooking.status === 'accepted' || profileBooking.status === 'completed') {
              // 檢查該預約是否已經被評論過
              if (profileBooking.clientReviewed) {
                console.log(`用戶 ${payload.userId} 評論特選魚市但該預約已被評論過，不重複計數`);
              } else {
                await userStatsModel.updateCounts(payload.userId, {
                  ladyBookingsCount: 1,
                });
                
                // 檢查是否為重複預約同一位後宮佳麗
                // 注意：這裡檢查的是「其他」預約（不包括當前預約），且已經評論過的
                const completedBookingsForSameProfile = clientBookings.filter(
                  b => b.profileId === profileId && 
                       (b.status === 'accepted' || b.status === 'completed') &&
                       b.id !== profileBooking.id &&
                       b.clientReviewed === true // 只計算已經評論過的其他預約
                );
                
                if (completedBookingsForSameProfile.length > 0) {
                  // 如果這是重複預約，增加重複預約計數
                  await userStatsModel.updateCounts(payload.userId, {
                    repeatLadyBookingsCount: 1,
                  });
                  console.log(`用戶 ${payload.userId} 重複預約特選魚市計數 +1`);
                }
                
                console.log(`用戶 ${payload.userId} 特選魚市預約計數 +1（預約已成功且首次評論）`);
              }
            } else {
              console.log(`用戶 ${payload.userId} 評論特選魚市但預約狀態為 ${profileBooking.status}，需等待預約成功`);
            }
          }
          
          // 檢查並解鎖成就（只有在計數後才檢查，且該預約還沒有被評論過）
          const stats = await userStatsModel.getOrCreate(payload.userId);
          const shouldCheckAchievements = 
            !profileBooking.clientReviewed && // 只有在首次評論時才檢查成就
            ((determinedCategory === 'premium_tea' && profileBooking.status === 'completed') ||
             (determinedCategory === 'lady_booking' && (profileBooking.status === 'accepted' || profileBooking.status === 'completed')));
          
          if (shouldCheckAchievements) {
              const unlocked = await achievementModel.checkAndUnlockAchievements(payload.userId);
              if (unlocked.length > 0) {
                console.log(`用戶 ${payload.userId} 解鎖了 ${unlocked.length} 個成就:`, unlocked.map(a => a.achievementName));
              }
              
              // 如果是後宮佳麗的評價，更新佳麗的統計數據並檢查成就
              if (profile && profile.userId) {
                // 更新佳麗的評論統計數據
                const providerStatsUpdates: any = {
                  totalReviewsCount: 1,
                };
                
                // 根據評分更新對應的星級統計
                if (rating === 5) {
                  providerStatsUpdates.fiveStarReviewsCount = 1;
                } else if (rating === 4) {
                  providerStatsUpdates.fourStarReviewsCount = 1;
                }
                
                // 如果預約已完成，更新完成預約次數
                if (profileBooking && profileBooking.status === 'completed') {
                  providerStatsUpdates.completedBookingsCount = 1;
                }
                
                // 更新佳麗的統計數據
                await userStatsModel.updateCounts(profile.userId, providerStatsUpdates);
                
                // 重新計算平均評分
                const { reviewModel } = await import('../models/Review.js');
                const avgRating = await reviewModel.getAverageRating(profileId);
                if (avgRating > 0) {
                  await userStatsModel.updateCounts(profile.userId, {
                    averageRating: avgRating,
                  });
                }
                
                // 更新回頭客統計數據（當預約完成並評論時）
                if (profileBooking && profileBooking.status === 'completed') {
                  try {
                    const { query } = await import('../db/database.js');
                    // 檢查該客戶是否為回頭客（之前有完成的預約）
                    const previousCompletedBookings = await query(`
                      SELECT COUNT(*) as count FROM bookings 
                      WHERE provider_id = $1 AND client_id = $2 AND status = 'completed' AND id != $3
                    `, [profile.userId, payload.userId, profileBooking.id]);
                    
                    const previousCount = parseInt(previousCompletedBookings.rows[0]?.count || '0');
                    
                    if (previousCount > 0) {
                      // 這是回頭客，更新回頭客預約次數
                      await userStatsModel.updateCounts(profile.userId, {
                        repeatClientBookingsCount: 1,
                      });
                      
                      // 計算不重複回頭客數量
                      const uniqueReturningClients = await query(`
                        SELECT COUNT(DISTINCT client_id) as count FROM bookings 
                        WHERE provider_id = $1 AND status = 'completed' AND client_id IN (
                          SELECT DISTINCT client_id FROM bookings 
                          WHERE provider_id = $1 AND status = 'completed' 
                          GROUP BY client_id HAVING COUNT(*) > 1
                        )
                      `, [profile.userId]);
                      
                      const uniqueCount = parseInt(uniqueReturningClients.rows[0]?.count || '0');
                      await userStatsModel.updateCounts(profile.userId, {
                        uniqueReturningClientsCount: uniqueCount,
                      });
                    }
                  } catch (error) {
                    console.error('更新回頭客統計數據失敗:', error);
                  }
                }
                
                // 檢查並解鎖佳麗的成就（必須在更新統計數據之後）
                const providerUnlocked = await achievementModel.checkAndUnlockAchievements(profile.userId);
                if (providerUnlocked.length > 0) {
                  console.log(`後宮佳麗 ${profile.userId} 自動解鎖了 ${providerUnlocked.length} 個成就:`, providerUnlocked.map(a => a.achievementName));
                  
                  // 發送成就解鎖通知給佳麗
                  try {
                    const { notificationModel } = await import('../models/Notification.js');
                    for (const achievement of providerUnlocked) {
                      await notificationModel.create({
                        userId: profile.userId,
                        type: 'achievement',
                        title: '🎉 成就解鎖',
                        content: `恭喜您解鎖了「${achievement.achievementName}」成就！獲得 ${achievement.pointsEarned} 積分和 ${achievement.experienceEarned} 經驗值。`,
                        link: `/user-profile?tab=achievements`,
                        metadata: {
                          achievementId: achievement.id,
                          achievementType: achievement.achievementType,
                          achievementName: achievement.achievementName,
                          pointsEarned: achievement.pointsEarned,
                          experienceEarned: achievement.experienceEarned,
                        },
                      });
                    }
                  } catch (error) {
                    console.error('發送成就解鎖通知失敗:', error);
                  }
                }
                
                // 如果評分是 4-5 星，更新佳麗的「獲得好評」任務進度
                if (rating >= 4) {
                  try {
                    const { tasksModel } = await import('../models/Tasks.js');
                    const { userStatsModel } = await import('../models/UserStats.js');
                    const providerTaskResult = await tasksModel.updateTaskProgress(profile.userId, 'lady_receive_good_review', 1);
                    if (providerTaskResult.completed) {
                      await userStatsModel.addPoints(profile.userId, providerTaskResult.pointsEarned, providerTaskResult.experienceEarned);
                      console.log(`後宮佳麗 ${profile.userId} 完成「獲得好評」任務，獲得 ${providerTaskResult.pointsEarned} 積分和 ${providerTaskResult.experienceEarned} 經驗值`);
                      
                      // 創建任務完成通知
                      try {
                        const { notificationModel } = await import('../models/Notification.js');
                        const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_receive_good_review');
                        if (definition) {
                          await notificationModel.create({
                            userId: profile.userId,
                            type: 'task',
                            title: '任務完成',
                            content: `恭喜您完成了「${definition.name}」任務！獲得 ${providerTaskResult.pointsEarned} 積分和 ${providerTaskResult.experienceEarned} 經驗值。`,
                            link: `/user-profile?tab=points`,
                            metadata: {
                              taskType: 'lady_receive_good_review',
                              taskName: definition.name,
                              pointsEarned: providerTaskResult.pointsEarned,
                              experienceEarned: providerTaskResult.experienceEarned,
                            },
                          });
                        }
                      } catch (error) {
                        console.error('創建佳麗任務完成通知失敗:', error);
                      }
                    }
                    
                    // 更新「維護品質」任務（連續 3 天都有獲得好評）
                    try {
                      const { query } = await import('../db/database.js');
                      const { notificationModel } = await import('../models/Notification.js');
                      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                      
                      // 獲取或創建連續天數記錄
                      let streakResult = await query(`
                        SELECT * FROM provider_quality_streaks WHERE user_id = $1
                      `, [profile.userId]);
                      
                      let consecutiveDays = 1;
                      if (streakResult.rows.length > 0) {
                        const streak = streakResult.rows[0];
                        const lastDate = new Date(streak.last_good_review_date);
                        const todayDate = new Date(today);
                        const diffTime = todayDate.getTime() - lastDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 0) {
                          // 同一天，不增加天數
                          consecutiveDays = streak.consecutive_days;
                        } else if (diffDays === 1) {
                          // 連續一天，增加天數
                          consecutiveDays = streak.consecutive_days + 1;
                          await query(`
                            UPDATE provider_quality_streaks 
                            SET last_good_review_date = $1, 
                                consecutive_days = $2,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = $3
                          `, [today, consecutiveDays, profile.userId]);
                        } else {
                          // 中斷了，重置為 1
                          consecutiveDays = 1;
                          await query(`
                            UPDATE provider_quality_streaks 
                            SET last_good_review_date = $1, 
                                consecutive_days = 1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = $2
                          `, [today, profile.userId]);
                        }
                      } else {
                        // 創建新記錄
                        const { v4: uuidv4 } = await import('uuid');
                        const streakId = `streak_${Date.now()}_${uuidv4().substring(0, 9)}`;
                        await query(`
                          INSERT INTO provider_quality_streaks (id, user_id, last_good_review_date, consecutive_days)
                          VALUES ($1, $2, $3, 1)
                        `, [streakId, profile.userId, today]);
                      }
                      
                      // 如果連續天數達到 3，檢查並完成任務
                      if (consecutiveDays >= 3) {
                        const date = tasksModel.getLocalDateString();
                        const task = await tasksModel.getOrCreateDailyTask(profile.userId, 'lady_maintain_quality', date);
                        
                        if (!task.isCompleted) {
                          const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_maintain_quality');
                          if (definition) {
                            // 直接設置為完成
                            await query(`
                              UPDATE daily_tasks 
                              SET progress = $1, 
                                  is_completed = TRUE,
                                  points_earned = $2
                              WHERE id = $3
                            `, [definition.target, definition.pointsReward, task.id]);
                            
                            // 添加積分和經驗值
                            await userStatsModel.addPoints(
                              profile.userId,
                              definition.pointsReward,
                              definition.experienceReward
                            );
                            
                            // 創建任務完成通知
                            await notificationModel.create({
                              userId: profile.userId,
                              type: 'task',
                              title: '任務完成',
                              content: `恭喜您完成了「${definition.name}」任務！獲得 ${definition.pointsReward} 積分和 ${definition.experienceReward} 經驗值。`,
                              link: `/user-profile?tab=points`,
                              metadata: {
                                taskType: 'lady_maintain_quality',
                                taskName: definition.name,
                                pointsEarned: definition.pointsReward,
                                experienceEarned: definition.experienceReward,
                              },
                            });
                          }
                        }
                      }
                    } catch (streakError) {
                      console.error('更新維護品質任務失敗:', streakError);
                    }
                  } catch (providerTaskError) {
                    console.error('更新佳麗任務進度失敗:', providerTaskError);
                    // 不影響評論創建，只記錄錯誤
                  }
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

// 佳麗評論茶客（需要登入且為 provider）
router.post('/clients/:clientId/reviews', async (req, res) => {
  try {
    const { clientId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    // 檢查用戶是否為 provider
    const user = await userModel.findById(payload.userId);
    if (!user || user.role !== 'provider') {
      return res.status(403).json({ error: '只有佳麗可以評論茶客' });
    }
    
    const { rating, comment, bookingId } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '評分必須在1-5之間' });
    }
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: '請輸入評論內容' });
    }
    
    // 檢查是否有有效的預約記錄
    if (bookingId) {
      const { bookingModel } = await import('../models/Booking.js');
      const booking = await bookingModel.getById(bookingId);
      if (!booking || booking.providerId !== payload.userId || booking.clientId !== clientId) {
        return res.status(403).json({ error: '無效的預約記錄' });
      }
    }
    
    // 創建評論
    const review = await reviewModel.create({
      clientId: payload.userId,
      clientName: user.userName || undefined,
      targetUserId: clientId,
      reviewType: 'client',
      rating,
      comment: comment.trim(),
      bookingId: bookingId || undefined,
    });
    
    // 更新預約的評論狀態
    if (bookingId) {
      try {
        const { bookingModel } = await import('../models/Booking.js');
        await bookingModel.updateReviewStatus(bookingId, 'provider', true);
      } catch (error) {
        console.error('更新預約評論狀態失敗:', error);
        // 不阻止評論創建，只記錄錯誤
      }
    }
    
    res.status(201).json(review);
  } catch (error: any) {
    console.error('Create client review error:', error);
    res.status(500).json({ error: error.message || '創建評論失敗' });
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

