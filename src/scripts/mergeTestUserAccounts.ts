import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

// 合併測試帳號：將舊 @test.com 帳號的 email 更新為 @teakingom.com，並刪除新創建的空帳號
async function mergeTestUserAccounts() {
  try {
    console.log('🔄 開始合併測試帳號...\n');

    // 初始化資料庫
    await initDatabase();

    const accountMappings = [
      { oldEmail: 'admin@test.com', newEmail: 'admin@teakingom.com' },
      { oldEmail: 'provider@test.com', newEmail: 'provider@teakingom.com' },
      { oldEmail: 'client@test.com', newEmail: 'client@teakingom.com' },
    ];

    for (const mapping of accountMappings) {
      try {
        // 查找舊帳號（有資料的）
        const oldUser = await userModel.findByEmailOrPhone(mapping.oldEmail);
        
        // 查找新帳號（可能沒有資料的）
        const newUser = await userModel.findByEmailOrPhone(mapping.newEmail);

        if (!oldUser) {
          console.log(`  ⏭️  找不到舊帳號: ${mapping.oldEmail}`);
          continue;
        }

        if (!newUser) {
          // 如果新帳號不存在，直接更新舊帳號的 email
          console.log(`  📝 更新 ${mapping.oldEmail} → ${mapping.newEmail}`);
          await query(
            'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [mapping.newEmail, oldUser.id]
          );
          console.log(`  ✅ 已更新帳號 email`);
          continue;
        }

        // 檢查新帳號是否有重要資料（發文、回覆、Profile、預約等）
        const newUserPosts = await query('SELECT COUNT(*) FROM forum_posts WHERE user_id = $1', [newUser.id]);
        const newUserReplies = await query('SELECT COUNT(*) FROM forum_replies WHERE user_id = $1', [newUser.id]);
        const newUserProfiles = await query('SELECT COUNT(*) FROM profiles WHERE "userId" = $1', [newUser.id]);
        const newUserBookings = await query('SELECT COUNT(*) FROM bookings WHERE client_id = $1 OR provider_id = $1', [newUser.id]);
        
        const hasImportantData = parseInt(newUserPosts.rows[0].count) > 0 || 
                                 parseInt(newUserReplies.rows[0].count) > 0 || 
                                 parseInt(newUserProfiles.rows[0].count) > 0 ||
                                 parseInt(newUserBookings.rows[0].count) > 0;

        if (hasImportantData) {
          console.log(`  ⚠️  新帳號 ${mapping.newEmail} 有重要資料，跳過合併`);
          continue;
        }

        // 新帳號沒有資料，可以安全刪除
        console.log(`  🔄 處理帳號: ${mapping.oldEmail} → ${mapping.newEmail}`);
        console.log(`     - 舊帳號 ID: ${oldUser.id}`);
        console.log(`     - 新帳號 ID: ${newUser.id}`);
        
        // 先刪除新帳號（因為外鍵約束會自動處理關聯資料）
        console.log(`     - 刪除新創建的空帳號...`);
        await query('DELETE FROM users WHERE id = $1', [newUser.id]);
        console.log(`     - ✅ 已刪除新帳號`);
        
        // 更新舊帳號的 email
        console.log(`     - 更新舊帳號 email...`);
        await query(
          'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [mapping.newEmail, oldUser.id]
        );
        console.log(`     - ✅ 已更新舊帳號 email`);
        
        // 驗證
        const updatedUser = await userModel.findById(oldUser.id);
        if (updatedUser && updatedUser.email === mapping.newEmail) {
          console.log(`     - ✅ 驗證成功: ${updatedUser.email}`);
        } else {
          console.log(`     - ⚠️  驗證失敗`);
        }

      } catch (error: any) {
        console.error(`  ❌ 處理失敗 ${mapping.oldEmail}:`, error.message);
      }
    }

    console.log('\n✅ 合併完成！\n');

    // 顯示最終狀態
    console.log('📋 最終帳號狀態:');
    for (const mapping of accountMappings) {
      const user = await userModel.findByEmailOrPhone(mapping.newEmail);
      if (user) {
        const stats = await query('SELECT * FROM user_stats WHERE user_id = $1', [user.id]);
        const posts = await query('SELECT COUNT(*) FROM forum_posts WHERE user_id = $1', [user.id]);
        console.log(`   ✅ ${mapping.newEmail}: ID=${user.id}, 統計=${stats.rows.length > 0 ? '有' : '無'}, 發文=${posts.rows[0].count}`);
      } else {
        console.log(`   ❌ ${mapping.newEmail}: 不存在`);
      }
    }

  } catch (error: any) {
    console.error('❌ 合併失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('mergeTestUserAccounts')) {
  mergeTestUserAccounts()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { mergeTestUserAccounts };

