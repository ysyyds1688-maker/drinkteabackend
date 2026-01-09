import { Router } from 'express';
import { forumModel } from '../models/Forum.js';
import { userStatsModel } from '../models/UserStats.js';
import { tasksModel } from '../models/Tasks.js';
import { achievementModel } from '../models/Achievement.js';
import { verifyToken } from '../services/authService.js';
import { query } from '../db/database.js';
import { forumPostsCache } from '../middleware/cacheMiddleware.js';
import { queryLimiter } from '../middleware/queryLimiter.js';

const router = Router();

// 版規內容定義（與前端保持一致）
export const getRulesContent = (category: string): { title: string; content: string; images: string[] } | null => {
  const rulesMap: Record<string, { title: string; rules: string[]; image: string }> = {
    '': {
      title: '御茶室通用版規',
      rules: [
        '尊重他人，禁止人身攻擊、惡意中傷或歧視性言論',
        '禁止涉及未成年人的內容或相關討論',
        '禁止在公開討論中直接拉客、推銷或發布個人聯絡方式（Line、電話等）',
        '禁止重複發帖、刷屏或惡意灌水',
        '禁止發布假資訊、詐騙訊息或誤導性內容',
        '發帖前請先搜尋是否有相關討論，避免重複發問',
        '請使用適當的標題和分類，方便其他用戶查找',
        '鼓勵友善交流，分享真實經驗，幫助其他茶友',
        '討論時請保持理性，尊重不同觀點和選擇',
        '違規內容將被刪除，嚴重者將被禁言或封號'
      ],
      image: '/images/茶訊公告/teaking_compressed_84mgy1wxt.jpg'
    },
    'general': {
      title: '綜合討論版規',
      rules: [
        '本版為綜合討論區，歡迎討論各種相關話題',
        '發帖前請選擇合適的分類，避免內容與其他專版重複',
        '禁止發布與平台無關的內容（如政治、宗教等敏感話題）',
        '討論時請保持理性，尊重不同觀點和選擇',
        '鼓勵分享有價值的資訊和真實經驗',
        '提問前請先搜尋相關討論，避免重複問題',
        '回覆時請言之有物，避免無意義的回覆',
        '禁止在討論中直接發布聯絡方式或進行私下交易'
      ],
      image: '/images/tea_king_jp_3qb1pmafm.jpg'
    },
    'premium_tea': {
      title: '嚴選好茶版規',
      rules: [
        '本版專門討論嚴選好茶相關話題，歡迎分享經驗和心得',
        '發帖時建議關聯相關的御選佳麗 profile，方便其他用戶參考',
        '分享經驗時請保持真實客觀，避免過度誇大或惡意貶低',
        '禁止在討論中直接發布聯絡方式、拉客或進行私下交易',
        '討論價格時請尊重市場行情，避免惡意壓價或哄抬',
        '鼓勵分享真實的預約和服務經驗，幫助其他茶友做選擇',
        '禁止發布御選佳麗的個人隱私資訊（如真實姓名、住址、身份證等）',
        '禁止發布未經同意的照片或影片',
        '如有糾紛，請透過平台客服處理，勿在版上公開爭執或人身攻擊'
      ],
      image: '/images/tea_king_jp_civgdeba2.jpg'
    },
    'fish_market': {
      title: '特選魚市版規',
      rules: [
        '本版專門討論特選魚市相關話題，歡迎分享經驗和心得',
        '發帖時建議關聯相關的佳麗 profile，方便其他用戶參考',
        '分享經驗時請保持真實，避免虛假宣傳或惡意中傷',
        '討論時請尊重所有參與者，避免歧視性言論或人身攻擊',
        '禁止在討論中直接發布聯絡方式、拉客或進行私下交易',
        '鼓勵分享真實的預約和服務經驗，幫助其他用戶做選擇',
        '禁止發布佳麗的個人隱私資訊（如真實姓名、住址等）',
        '禁止發布未經同意的照片或影片',
        '如有問題或糾紛，請透過平台客服處理，勿在版上公開爭執'
      ],
      image: '/images/tea_king_jp_6lx9ajxz4.jpg'
    },
    'booking': {
      title: '預約交流版規',
      rules: [
        '本版專門討論預約流程、注意事項和經驗分享',
        '本版適用於嚴選好茶和特選魚市的預約交流',
        '發帖時可關聯相關的預約記錄（系統會自動驗證真實性）',
        '分享預約經驗時請保持真實，幫助其他用戶了解流程',
        '禁止發布虛假的預約經驗或誤導性資訊',
        '討論預約流程時請尊重平台規則，遵守預約流程',
        '禁止在版上進行預約交易、拉客或私下聯絡',
        '如有預約問題，請先查看平台說明或聯繫客服',
        '鼓勵分享預約技巧、注意事項和避坑經驗',
        '禁止發布佳麗或客戶的個人隱私資訊',
        '預約相關糾紛請透過平台客服處理，勿在版上公開爭執或人身攻擊'
      ],
      image: '/images/tea_king_jp_uumox9yah.jpg'
    },
    'experience': {
      title: '經驗分享版規',
      rules: [
        '本版鼓勵分享真實的服務經驗和心得，幫助其他茶友',
        '分享時請保持客觀真實，避免過度誇大或惡意貶低',
        '禁止發布虛假經驗、廣告宣傳或誤導性內容',
        '分享時請尊重他人，避免使用不當言詞或人身攻擊',
        '鼓勵詳細描述服務過程和感受，幫助其他用戶做選擇',
        '禁止在經驗分享中直接發布聯絡方式或拉客',
        '禁止發布個人隱私資訊或未經同意的照片、影片',
        '如有負面經驗，請保持理性客觀，避免惡意攻擊或造謠',
        '鼓勵分享正面經驗，但請保持真實，避免過度美化'
      ],
      image: '/images/tea_king_jp_pmeposdv7.jpg'
    },
    'question': {
      title: '問題求助版規',
      rules: [
        '提問前請先搜尋相關討論，避免重複發問',
        '提問時請清楚描述問題，方便其他用戶回答',
        '禁止發布與平台無關的問題（如政治、宗教等）',
        '提問時請保持禮貌，尊重回答者的時間和建議',
        '鼓勵回答者提供有價值的建議和真實資訊',
        '禁止在問題中直接詢問聯絡方式、拉客或進行交易',
        '問題解決後，建議更新帖子標記已解決，幫助其他用戶',
        '禁止發布涉及個人隱私的問題（如真實姓名、住址等）',
        '如有緊急問題或糾紛，請直接聯繫平台客服處理'
      ],
      image: '/images/tea_king_jp_vrzcszolm.jpg'
    },
    'chat': {
      title: '閒聊區版規',
      rules: [
        '本版為輕鬆交流區，歡迎友善的閒聊話題',
        '請保持友善和尊重，禁止人身攻擊或惡意中傷',
        '禁止涉及未成年人的內容或相關討論',
        '禁止廣告、推銷、拉客或商業推廣',
        '禁止重複發帖或惡意刷屏',
        '討論時請避免涉及過於敏感的話題（如政治、宗教等）',
        '鼓勵分享生活趣事、心情交流等輕鬆話題',
        '請勿在閒聊區發布正式的求助或經驗分享（請使用對應專版）',
        '禁止在閒聊中直接發布聯絡方式或進行私下交易'
      ],
      image: '/images/tea_king_jp_2u8qtiwms.jpg'
    },
    'lady_promotion': {
      title: '佳麗御選名鑑版規',
      rules: [
        '本版專為佳麗提供宣傳平台，僅限佳麗角色發帖',
        '歡迎發布個人宣傳、服務介紹、優惠活動等內容',
        '禁止直接發布聯絡方式（Line、電話、Telegram 等），實際預約需透過特選魚市進行，可在此說明預約流程（為保護佳麗安全）',
        '可以發布個人照片、服務照片（需確保已成年且為本人）',
        '禁止直接發布價格資訊、服務項目、營業時間等，實際預約需透過特選魚市進行，可在此說明預約流程（為保護佳麗安全）',
        '鼓勵詳細介紹個人特色、服務內容和優勢',
        '禁止發布涉及未成年人的內容（為保護佳麗安全）',
        '禁止發布虛假資訊、詐騙訊息或誤導性內容（為保護佳麗安全）',
        '禁止惡意攻擊其他佳麗或客戶（為保護佳麗安全）',
        '禁止發布違法內容或涉及非法交易（為保護佳麗安全）',
        '建議定期更新帖子，保持內容新鮮度',
        '客戶可在帖子下回覆詢問，請友善回應'
      ],
      image: '/images/tea_king_jp_at1x02l7e.jpg'
    },
    'announcement': {
      title: '官方公告版規',
      rules: [
        '本版僅供管理員發布官方公告',
        '一般用戶無法在此版發帖',
        '請定期關注官方公告，了解平台最新資訊',
        '公告內容具有權威性，請遵守相關規定',
        '如有疑問，請透過客服管道詢問',
        '禁止在公告下發布無關回覆或惡意評論',
        '重要公告請務必仔細閱讀'
      ],
      image: '/images/茶訊公告/teaking_compressed_rsybynlwm.jpg'
    }
  };

  const rules = rulesMap[category];
  if (!rules) return null;

  const rulesContent = rules.rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n\n');
  
  return {
    title: rules.title,
    content: rulesContent + '\n\n---\n\n**📝 請在下方留言簽到，表示您已閱讀並同意遵守以上版規。**',
    images: [rules.image]
  };
};

// 獲取帖子列表（帶緩存和查詢限制）
router.get('/posts', queryLimiter, forumPostsCache, async (req, res) => {
  try {
    const { category, sortBy = 'latest', limit, offset } = req.query;
    
    // 如果 category 是空字符串，轉換為 undefined
    const categoryParam = category && (category as string).trim() !== '' 
      ? (category as string).trim() 
      : undefined;
    
    const posts = await forumModel.getPosts({
      category: categoryParam,
      sortBy: sortBy as 'latest' | 'hot' | 'replies' | 'views' | 'favorites',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    
    // 檢查是否已收藏（如果已登入）- 優化：批量查詢而不是逐個查詢
    let favoritedPosts: Set<string> = new Set();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload && posts.length > 0) {
        // 批量查詢所有收藏狀態，避免 N+1 查詢問題
        const postIds = posts.map(p => p.id);
        const favorites = await forumModel.getFavoritesByPostIds(payload.userId, postIds);
        favorites.forEach(fav => favoritedPosts.add(fav));
      }
    }
    
    res.json({ posts, favoritedPostIds: Array.from(favoritedPosts) });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: error.message || '獲取帖子失敗' });
  }
});

// 獲取特定用戶的帖子（必須在 /posts/:id 之前，否則會被 /posts/:id 攔截）
router.get('/posts/user/:userId', async (req, res) => {
  try {
    let { userId } = req.params;
    
    // 解碼 URL 編碼的 userId（處理特殊字符如 #）
    try {
      userId = decodeURIComponent(userId);
    } catch (e) {
      // 如果解碼失敗，使用原始值
      console.warn('Failed to decode userId:', userId, e);
    }
    const { limit, offset } = req.query;
    
    const posts = await forumModel.getPostsByUserId(
      userId,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );
    
    res.json({ posts });
  } catch (error: any) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: error.message || '獲取用戶帖子失敗' });
  }
});

// 獲取單個帖子
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 如果是版規帖子且不存在，先創建
    if (id.startsWith('rules_')) {
      let category = id.replace('rules_', '');
      if (category === 'all') {
        category = '';
      }
      
      const existingPost = await query('SELECT id FROM forum_posts WHERE id = $1', [id]);
      const rulesContent = getRulesContent(category);
      if (rulesContent) {
        const adminUsers = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
        const systemUserId = adminUsers.rows.length > 0 ? adminUsers.rows[0].id : 'system';
        
        if (existingPost.rows.length === 0) {
          // 創建新帖子
          await query(`
            INSERT INTO forum_posts (id, user_id, title, content, category, images, is_pinned, is_locked)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            id,
            systemUserId,
            `【版規】${rulesContent.title}`,
            rulesContent.content,
            category || '',
            JSON.stringify(rulesContent.images),
            true,
            false,
          ]);
        } else {
          // 更新現有帖子（確保使用最新版規）
          await query(`
            UPDATE forum_posts 
            SET 
              title = $1,
              content = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [
            `【版規】${rulesContent.title}`,
            rulesContent.content,
            id
          ]);
        }
      }
    }
    
    const post = await forumModel.getPostById(id);
    
    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    // 獲取回覆
    const replies = await forumModel.getRepliesByPostId(id);
    
    // 檢查是否已點讚和已收藏（如果已登入）
    let isLiked = false;
    let isFavorited = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        isLiked = await forumModel.isLiked(payload.userId, 'post', id);
        isFavorited = await forumModel.isFavorited(payload.userId, id);
      }
    }
    
    res.json({ post, replies, isLiked, isFavorited });
  } catch (error: any) {
    console.error('Get post error:', error);
    res.status(500).json({ error: error.message || '獲取帖子失敗' });
  }
});

// 創建帖子
router.post('/posts', async (req, res) => {
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
    
    const { title, content, category, tags, images, videos, relatedProfileId, relatedReviewId } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ error: '標題、內容和分類為必填項' });
    }
    
    // 檢查佳麗御選名鑑的發帖權限
    if (category === 'lady_promotion') {
      const { userModel } = await import('../models/User.js');
      const user = await userModel.findById(payload.userId);
      if (!user || user.role !== 'provider') {
        return res.status(403).json({ error: '此版區僅限佳麗發帖宣傳' });
      }
    }
    
    const post = await forumModel.createPost({
      userId: payload.userId,
      title,
      content,
      category,
      tags,
      images,
      videos,
      relatedProfileId,
      relatedReviewId,
    });
    
    // 更新統計和任務
    await userStatsModel.updateCounts(payload.userId, { postsCount: 1 });
    const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'create_post');
    
    // 如果任務完成，添加積分和經驗值
    let pointsResult = null;
    if (taskResult.completed) {
      pointsResult = await userStatsModel.addPoints(
        payload.userId,
        taskResult.pointsEarned,
        taskResult.experienceEarned
      );
      
      // 創建任務完成通知
      try {
        const { notificationModel } = await import('../models/Notification.js');
        const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'create_post');
        if (definition) {
          await notificationModel.create({
            userId: payload.userId,
            type: 'task',
            title: '任務完成',
            content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
            link: `/user-profile?tab=points`,
            metadata: {
              taskType: 'create_post',
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
    
    // 如果是佳麗，更新「論壇互動」任務（發表 1 篇帖子即可完成）
    try {
      const { userModel } = await import('../models/User.js');
      const user = await userModel.findById(payload.userId);
      if (user && user.role === 'provider') {
        // 發表帖子時，直接設置進度為 target 來完成任務
        const date = tasksModel.getLocalDateString();
        const task = await tasksModel.getOrCreateDailyTask(payload.userId, 'lady_forum_interaction', date);
        
        if (!task.isCompleted) {
          const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_forum_interaction');
          if (definition) {
            // 直接設置進度為 target，完成任務
            const { query } = await import('../db/database.js');
            await query(`
              UPDATE daily_tasks 
              SET progress = $1, 
                  is_completed = TRUE,
                  points_earned = $2
              WHERE id = $3
            `, [definition.target, definition.pointsReward, task.id]);
            
            // 添加積分和經驗值
            await userStatsModel.addPoints(
              payload.userId,
              definition.pointsReward,
              definition.experienceReward
            );
            
            // 創建任務完成通知
            try {
              const { notificationModel } = await import('../models/Notification.js');
              await notificationModel.create({
                userId: payload.userId,
                type: 'task',
                title: '任務完成',
                content: `恭喜您完成了「${definition.name}」任務！獲得 ${definition.pointsReward} 積分和 ${definition.experienceReward} 經驗值。`,
                link: `/user-profile?tab=points`,
                metadata: {
                  taskType: 'lady_forum_interaction',
                  taskName: definition.name,
                  pointsEarned: definition.pointsReward,
                  experienceEarned: definition.experienceReward,
                },
              });
            } catch (error) {
              console.error('創建佳麗論壇互動任務完成通知失敗:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('更新佳麗論壇互動任務失敗:', error);
    }
    
    // 檢查特選魚市版區發文任務（在特選魚市版區發文時）
    if (category === 'fish_market') {
      try {
        // 更新特選魚市版區發文任務進度
        const forumTaskResult = await tasksModel.updateTaskProgress(payload.userId, 'post_in_lady_forum', 1);
        if (forumTaskResult.completed) {
          await userStatsModel.addPoints(payload.userId, forumTaskResult.pointsEarned, forumTaskResult.experienceEarned);
          console.log(`用戶 ${payload.userId} 完成「特選魚市分享」任務，獲得 ${forumTaskResult.pointsEarned} 積分和 ${forumTaskResult.experienceEarned} 經驗值`);
          
          // 創建任務完成通知
          try {
            const { notificationModel } = await import('../models/Notification.js');
            const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'post_in_lady_forum');
            if (definition) {
              await notificationModel.create({
                userId: payload.userId,
                type: 'task',
                title: '任務完成',
                content: `恭喜您完成了「${definition.name}」任務！獲得 ${forumTaskResult.pointsEarned} 積分和 ${forumTaskResult.experienceEarned} 經驗值。`,
                link: `/user-profile?tab=points`,
                metadata: {
                  taskType: 'post_in_lady_forum',
                  taskName: definition.name,
                  pointsEarned: forumTaskResult.pointsEarned,
                  experienceEarned: forumTaskResult.experienceEarned,
                },
              });
            }
          } catch (error) {
            console.error('創建任務完成通知失敗:', error);
          }
        }
      } catch (error) {
        console.error('檢查特選魚市版區發文任務失敗:', error);
        // 不影響帖子創建，只記錄錯誤
      }
    }
    
    // 檢查並解鎖成就
    const unlockedAchievements = await achievementModel.checkAndUnlockAchievements(payload.userId);
    
    res.status(201).json({
      post,
      taskCompleted: taskResult.completed,
      pointsEarned: taskResult.completed ? taskResult.pointsEarned : 0,
      experienceEarned: taskResult.completed ? taskResult.experienceEarned : 0,
      levelUp: pointsResult?.levelUp || false,
      newLevel: pointsResult?.newLevel,
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined,
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || '創建帖子失敗' });
  }
});

// 創建回覆
router.post('/posts/:postId/replies', async (req, res) => {
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
    
    const { postId } = req.params;
    const { content, parentReplyId } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '回覆內容不能為空' });
    }
    
    // 檢查是否為版規帖子，如果是且不存在，則先創建
    if (postId.startsWith('rules_')) {
      let category = postId.replace('rules_', '');
      if (category === 'all') {
        category = '';
      }
      
      // 檢查帖子是否存在
      const existingPost = await query('SELECT id FROM forum_posts WHERE id = $1', [postId]);
      if (existingPost.rows.length === 0) {
        // 創建版規帖子
        const rulesContent = getRulesContent(category);
        if (rulesContent) {
          // 嘗試找到管理員用戶
          const adminUsers = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
          const systemUserId = adminUsers.rows.length > 0 ? adminUsers.rows[0].id : payload.userId;
          
          // 直接插入版規帖子，使用指定的 ID
          await query(`
            INSERT INTO forum_posts (id, user_id, title, content, category, images, is_pinned, is_locked)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            postId,
            systemUserId,
            `【版規】${rulesContent.title}`,
            rulesContent.content,
            category || '',
            JSON.stringify(rulesContent.images),
            true, // 置頂
            false, // 不鎖定，允許回覆簽到
          ]);
        }
      }
    }
    
    // 檢查是否為版規簽到
    const isRulesCheckIn = postId.startsWith('rules_');
    let hasCheckedInBefore = false;
    
    if (isRulesCheckIn) {
      // 檢查用戶是否已經在這個版規帖子簽到過
      const existingReplies = await query(
        'SELECT id FROM forum_replies WHERE post_id = $1 AND user_id = $2',
        [postId, payload.userId]
      );
      hasCheckedInBefore = existingReplies.rows.length > 0;
    }
    
    const reply = await forumModel.createReply({
      postId,
      userId: payload.userId,
      content: content.trim(),
      parentReplyId,
    });
    
    // 發送回覆通知
    try {
      const { notificationModel } = await import('../models/Notification.js');
      const { userModel } = await import('../models/User.js');
      
      // 獲取帖子信息
      const post = await forumModel.getPostById(postId);
      
      // 如果回覆的是某個留言（有 parentReplyId）
      if (parentReplyId) {
        // 獲取被回覆的留言信息
        const parentReply = await forumModel.getReplyById(parentReplyId);
        if (parentReply && parentReply.userId !== payload.userId) {
          // 獲取回覆者的用戶名
          const replyUser = await userModel.findById(payload.userId);
          const replyUserName = replyUser?.userName || '某位用戶';
          
          // 發送通知給被回覆的用戶
          await notificationModel.create({
            userId: parentReply.userId,
            type: 'message',
            title: '有人回覆了您的留言',
            content: `${replyUserName} 回覆了您在「${post?.title || '帖子'}」中的留言：${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}`,
            link: `/forum/post/${postId}`,
            metadata: {
              type: 'reply_to_reply',
              postId,
              replyId: reply.id,
              parentReplyId,
              replyUserId: payload.userId,
              replyUserName,
            },
          });
        }
      } else {
        // 如果回覆的是帖子本身（不是回覆留言），通知帖子作者
        if (post && post.userId !== payload.userId) {
          // 獲取回覆者的用戶名
          const replyUser = await userModel.findById(payload.userId);
          const replyUserName = replyUser?.userName || '某位用戶';
          
          // 發送通知給帖子作者
          await notificationModel.create({
            userId: post.userId,
            type: 'message',
            title: '有人回覆了您的帖子',
            content: `${replyUserName} 回覆了您的帖子「${post.title}」：${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}`,
            link: `/forum/post/${postId}`,
            metadata: {
              type: 'reply_to_post',
              postId,
              replyId: reply.id,
              replyUserId: payload.userId,
              replyUserName,
            },
          });
        }
      }
    } catch (error) {
      console.error('發送回覆通知失敗:', error);
      // 不阻止回覆創建，只記錄錯誤
    }
    
    // 更新統計和任務
    await userStatsModel.updateCounts(payload.userId, { repliesCount: 1 });
    const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'reply_post');
    
    // 如果是佳麗，更新「論壇互動」任務（回覆 3 篇完成）
    try {
      const { userModel } = await import('../models/User.js');
      const user = await userModel.findById(payload.userId);
      if (user && user.role === 'provider') {
        const forumInteractionResult = await tasksModel.updateTaskProgress(payload.userId, 'lady_forum_interaction', 1);
        if (forumInteractionResult.completed) {
          await userStatsModel.addPoints(
            payload.userId,
            forumInteractionResult.pointsEarned,
            forumInteractionResult.experienceEarned
          );
          
          // 創建任務完成通知
          try {
            const { notificationModel } = await import('../models/Notification.js');
            const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_forum_interaction');
            if (definition) {
              await notificationModel.create({
                userId: payload.userId,
                type: 'task',
                title: '任務完成',
                content: `恭喜您完成了「${definition.name}」任務！獲得 ${forumInteractionResult.pointsEarned} 積分和 ${forumInteractionResult.experienceEarned} 經驗值。`,
                link: `/user-profile?tab=points`,
                metadata: {
                  taskType: 'lady_forum_interaction',
                  taskName: definition.name,
                  pointsEarned: forumInteractionResult.pointsEarned,
                  experienceEarned: forumInteractionResult.experienceEarned,
                },
              });
            }
          } catch (error) {
            console.error('創建佳麗論壇互動任務完成通知失敗:', error);
          }
        }
      }
    } catch (error) {
      console.error('更新佳麗論壇互動任務失敗:', error);
    }
    
    // 發表評論經驗值獎勵邏輯
    let pointsResult = null;
    let checkInBonus = { points: 0, experience: 0 };
    let baseExperience = 8; // 基礎回覆經驗值（僅用於非版規帖子）
    
    try {
      // 如果是版規簽到
      if (isRulesCheckIn) {
        // 只有首次簽到才給獎勵
        if (!hasCheckedInBefore) {
          // 版規首次簽到獎勵：+20 積分 + 15 經驗值
          checkInBonus = { points: 20, experience: 15 };
          // 版規首次簽到：只給簽到獎勵，不給回覆獎勵
          pointsResult = await userStatsModel.addPoints(
            payload.userId,
            20, // 積分
            15  // 經驗值（僅簽到獎勵，不含回覆獎勵）
          );
          
          // 創建簽到獎勵通知
          try {
            const { notificationModel } = await import('../models/Notification.js');
            await notificationModel.create({
              userId: payload.userId,
              type: 'system',
              title: '版規簽到獎勵',
              content: `感謝您閱讀並簽到版規！獲得 ${checkInBonus.points} 積分和 ${checkInBonus.experience} 經驗值獎勵。`,
              link: `/user-profile?tab=points`,
              metadata: {
                type: 'rules_checkin',
                pointsEarned: checkInBonus.points,
                experienceEarned: checkInBonus.experience,
              },
            });
          } catch (error) {
            console.error('創建簽到獎勵通知失敗:', error);
          }
        }
        // 版規後續回覆：不給任何經驗值或積分
      } else {
        // 普通帖子回覆獎勵（+8經驗值/次）
        pointsResult = await userStatsModel.addPoints(payload.userId, 0, baseExperience);
      }
    } catch (error) {
      console.error('給評論者經驗值失敗:', error);
    }
    
    // 如果任務完成，添加任務積分和經驗值
    if (taskResult.completed) {
      const taskPointsResult = await userStatsModel.addPoints(
        payload.userId,
        taskResult.pointsEarned,
        taskResult.experienceEarned
      );
      // 如果任務完成導致升級，使用任務的升級結果
      if (taskPointsResult.levelUp) {
        pointsResult = taskPointsResult;
      }
      
      // 創建任務完成通知
      try {
        const { notificationModel } = await import('../models/Notification.js');
        const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'reply_post');
        if (definition) {
          await notificationModel.create({
            userId: payload.userId,
            type: 'task',
            title: '任務完成',
            content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
            link: `/user-profile?tab=points`,
            metadata: {
              taskType: 'reply_post',
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
    
    // 檢查並解鎖成就
    const unlockedAchievements = await achievementModel.checkAndUnlockAchievements(payload.userId);
    
    // 計算總獎勵
    let totalPointsEarned = taskResult.completed ? taskResult.pointsEarned : 0;
    let totalExperienceEarned = taskResult.completed ? taskResult.experienceEarned : 0;
    
    if (isRulesCheckIn) {
      // 版規帖子：只有首次簽到才有獎勵
      if (!hasCheckedInBefore) {
        totalPointsEarned += checkInBonus.points;
        totalExperienceEarned += checkInBonus.experience;
      }
      // 版規後續回覆：不給任何獎勵
    } else {
      // 普通帖子：回覆給經驗值
      totalExperienceEarned += baseExperience;
    }
    
    res.status(201).json({
      reply,
      taskCompleted: taskResult.completed,
      pointsEarned: totalPointsEarned,
      experienceEarned: totalExperienceEarned,
      checkInBonus: isRulesCheckIn && !hasCheckedInBefore ? {
        points: checkInBonus.points,
        experience: checkInBonus.experience
      } : undefined,
      isFirstCheckIn: isRulesCheckIn && !hasCheckedInBefore,
      isRulesPost: isRulesCheckIn,
      levelUp: pointsResult?.levelUp || false,
      newLevel: pointsResult?.newLevel,
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined,
    });
  } catch (error: any) {
    console.error('Create reply error:', error);
    res.status(500).json({ error: error.message || '創建回覆失敗' });
  }
});

// 點讚/取消點讚
router.post('/likes', async (req, res) => {
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
    
    const { targetType, targetId } = req.body;
    
    if (!targetType || !targetId || !['post', 'reply'].includes(targetType)) {
      return res.status(400).json({ error: '無效的參數' });
    }
    
    const likeResult = await forumModel.toggleLike(payload.userId, targetType, targetId);
    
    // 更新任務進度（如果是點讚）
    if (likeResult.liked) {
      await tasksModel.updateTaskProgress(payload.userId, 'like_content');
      
      // 給被點讚者經驗值獎勵（+2經驗值/次）
      if (likeResult.authorId && likeResult.authorId !== payload.userId) {
        try {
          await userStatsModel.addPoints(likeResult.authorId, 0, 2); // 只給經驗值，不給積分
          await userStatsModel.updateCounts(likeResult.authorId, { likesReceived: 1 });
        } catch (error) {
          console.error('給被點讚者經驗值失敗:', error);
        }
      }
    }
    
    res.json({ liked: likeResult.liked });
  } catch (error: any) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: error.message || '操作失敗' });
  }
});

// 刪除帖子（僅管理員）
// PUT /api/forum/posts/:id - 更新帖子
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }

    // 獲取帖子信息
    const post = await forumModel.getPostById(id);
    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    // 檢查權限：管理員或帖子作者可以編輯
    const isAdmin = payload.role === 'admin';
    const isAuthor = post.userId === payload.userId;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ error: '您沒有權限編輯此帖子' });
    }

    // 提取可更新的字段
    const { title, content, category, tags, images, videos, relatedProfileId, relatedReviewId } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (images !== undefined) updateData.images = images;
    if (videos !== undefined) updateData.videos = videos;
    if (relatedProfileId !== undefined) updateData.relatedProfileId = relatedProfileId;
    if (relatedReviewId !== undefined) updateData.relatedReviewId = relatedReviewId;

    const updatedPost = await forumModel.updatePost(id, updateData);
    if (!updatedPost) {
      return res.status(404).json({ error: '更新失敗' });
    }

    res.json(updatedPost);
  } catch (error: any) {
    console.error('Update post error:', error);
    res.status(500).json({ error: error.message || '更新帖子失敗' });
  }
});

router.delete('/posts/:id', async (req, res) => {
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

    // 檢查是否為管理員
    const { userModel } = await import('../models/User.js');
    const user = await userModel.findById(payload.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可執行此操作' });
    }
    
    const { id } = req.params;
    const deleted = await forumModel.deletePost(id);
    
    if (!deleted) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    res.json({ success: true, message: '帖子已刪除' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message || '刪除帖子失敗' });
  }
});

// 刪除回覆（僅管理員）
router.delete('/replies/:id', async (req, res) => {
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

    // 檢查是否為管理員
    const { userModel } = await import('../models/User.js');
    const user = await userModel.findById(payload.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可執行此操作' });
    }
    
    const { id } = req.params;
    const deleted = await forumModel.deleteReply(id);
    
    if (!deleted) {
      return res.status(404).json({ error: '回覆不存在' });
    }
    
    res.json({ success: true, message: '回覆已刪除' });
  } catch (error: any) {
    console.error('Delete reply error:', error);
    res.status(500).json({ error: error.message || '刪除回覆失敗' });
  }
});

// 切換收藏
router.post('/favorites', async (req, res) => {
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
    
    const { postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: '帖子ID為必填項' });
    }
    
    const result = await forumModel.toggleFavorite(payload.userId, postId);
    
    res.json(result);
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: error.message || '操作失敗' });
  }
});

// 獲取用戶收藏列表
router.get('/favorites', async (req, res) => {
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
    
    const { limit, offset } = req.query;
    
    const posts = await forumModel.getFavoritesByUserId(
      payload.userId,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );
    
    res.json({ posts });
  } catch (error: any) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: error.message || '獲取收藏列表失敗' });
  }
});


// 創建舉報
router.post('/reports', async (req, res) => {
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
    
    const { postId, replyId, reason } = req.body;
    
    if (!postId && !replyId) {
      return res.status(400).json({ error: '帖子ID或回覆ID至少需要一個' });
    }
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: '舉報原因為必填項' });
    }
    
    const report = await forumModel.createReport({
      reporterId: payload.userId,
      postId,
      replyId,
      reason: reason.trim(),
    });
    
    res.status(201).json({ success: true, reportId: report.id, message: '舉報已提交，管理員將盡快處理' });
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ error: error.message || '提交舉報失敗' });
  }
});

export default router;

