import { query } from '../db/database.js';
import { getRulesContent } from '../routes/forum.js';

async function updateRulesPost() {
  try {
    console.log('開始更新版規帖子...');
    
    const category = 'lady_promotion';
    const postId = `rules_${category}`;
    
    // 獲取最新的版規內容
    const rulesContent = getRulesContent(category);
    
    if (!rulesContent) {
      console.error('無法獲取版規內容');
      return;
    }
    
    // 檢查帖子是否存在
    const existingPost = await query('SELECT id FROM forum_posts WHERE id = $1', [postId]);
    
    if (existingPost.rows.length > 0) {
      // 更新現有帖子
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
        postId
      ]);
      
      console.log(`✅ 已更新版規帖子: ${postId}`);
      console.log(`標題: 【版規】${rulesContent.title}`);
    } else {
      // 創建新帖子
      const adminUsers = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      const systemUserId = adminUsers.rows.length > 0 ? adminUsers.rows[0].id : 'system';
      
      await query(`
        INSERT INTO forum_posts (id, user_id, title, content, category, images, is_pinned, is_locked)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        postId,
        systemUserId,
        `【版規】${rulesContent.title}`,
        rulesContent.content,
        category,
        JSON.stringify(rulesContent.images),
        true,
        false,
      ]);
      
      console.log(`✅ 已創建版規帖子: ${postId}`);
    }
    
    console.log('版規帖子更新完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('更新版規帖子失敗:', error);
    process.exit(1);
  }
}

updateRulesPost();


