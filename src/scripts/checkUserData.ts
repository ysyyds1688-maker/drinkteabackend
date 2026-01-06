import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

// 檢查用戶資料是否完整
async function checkUserData() {
  try {
    console.log('🔍 開始檢查用戶資料...\n');

    // 初始化資料庫
    await initDatabase();

    const emails = [
      'admin@test.com',
      'admin@teakingom.com',
      'provider@test.com',
      'provider@teakingom.com',
      'client@test.com',
      'client@teakingom.com',
    ];

    for (const email of emails) {
      const user = await userModel.findByEmailOrPhone(email);
      
      if (user) {
        console.log(`\n✅ 找到用戶: ${email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   用戶名: ${user.userName || '無'}`);
        console.log(`   創建時間: ${user.createdAt}`);
        
        // 檢查關聯資料
        const stats = await query('SELECT * FROM user_stats WHERE user_id = $1', [user.id]);
        console.log(`   統計資料: ${stats.rows.length > 0 ? '✅ 存在' : '❌ 不存在'}`);
        
        const profiles = await query('SELECT * FROM profiles WHERE "userId" = $1', [user.id]);
        console.log(`   Profile 資料: ${profiles.rows.length} 筆`);
        
        const posts = await query('SELECT COUNT(*) FROM forum_posts WHERE user_id = $1', [user.id]);
        console.log(`   論壇發文: ${posts.rows[0].count} 筆`);
        
        const replies = await query('SELECT COUNT(*) FROM forum_replies WHERE user_id = $1', [user.id]);
        console.log(`   論壇回覆: ${replies.rows[0].count} 筆`);
        
        const favorites = await query('SELECT COUNT(*) FROM favorites WHERE user_id = $1', [user.id]);
        console.log(`   收藏: ${favorites.rows[0].count} 筆`);
        
        const bookings = await query('SELECT COUNT(*) FROM bookings WHERE client_id = $1 OR provider_id = $1', [user.id]);
        console.log(`   預約: ${bookings.rows[0].count} 筆`);
      } else {
        console.log(`\n❌ 找不到用戶: ${email}`);
      }
    }

    console.log('\n✅ 檢查完成！\n');

  } catch (error: any) {
    console.error('❌ 檢查失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('checkUserData')) {
  checkUserData()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { checkUserData };

