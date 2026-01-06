import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

// 更新測試用戶的 email 從 @test.com 改為 @teakingom.com
async function updateTestUserEmails() {
  try {
    console.log('🚀 開始更新測試用戶 email...\n');

    // 初始化資料庫
    await initDatabase();

    // 定義要更新的 email 對應關係
    const emailMappings = [
      { oldEmail: 'admin@test.com', newEmail: 'admin@teakingom.com' },
      { oldEmail: 'provider@test.com', newEmail: 'provider@teakingom.com' },
      { oldEmail: 'client@test.com', newEmail: 'client@teakingom.com' },
    ];

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const mapping of emailMappings) {
      try {
        // 查找舊 email 的用戶
        const user = await userModel.findByEmailOrPhone(mapping.oldEmail);
        
        if (!user) {
          console.log(`  ⏭️  找不到用戶: ${mapping.oldEmail}`);
          skipped++;
          continue;
        }

        // 檢查新 email 是否已被使用
        const existingUser = await userModel.findByEmailOrPhone(mapping.newEmail);
        if (existingUser && existingUser.id !== user.id) {
          console.log(`  ⚠️  新 email ${mapping.newEmail} 已被其他用戶使用，跳過更新`);
          skipped++;
          continue;
        }

        // 更新 email
        await query(
          'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [mapping.newEmail, user.id]
        );

        console.log(`  ✅ 已更新: ${mapping.oldEmail} → ${mapping.newEmail}`);
        updated++;

        // 驗證更新
        const updatedUser = await userModel.findById(user.id);
        if (updatedUser && updatedUser.email === mapping.newEmail) {
          console.log(`     ✓ 驗證成功: ${updatedUser.email}`);
        } else {
          console.log(`     ⚠️  驗證失敗: 更新後的 email 不匹配`);
        }

      } catch (error: any) {
        console.error(`  ❌ 更新失敗 ${mapping.oldEmail}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ 更新完成:`);
    console.log(`   - 成功更新: ${updated} 個`);
    console.log(`   - 跳過: ${skipped} 個`);
    console.log(`   - 錯誤: ${errors} 個`);

    // 顯示更新後的用戶列表
    console.log(`\n📋 更新後的測試帳號:`);
    for (const mapping of emailMappings) {
      const user = await userModel.findByEmailOrPhone(mapping.newEmail);
      if (user) {
        console.log(`   ✅ ${mapping.newEmail} (角色: ${user.role})`);
      } else {
        console.log(`   ❌ ${mapping.newEmail} (未找到)`);
      }
    }

    console.log('\n✅ 處理完成！\n');

  } catch (error: any) {
    console.error('❌ 更新失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('updateTestUserEmails')) {
  updateTestUserEmails()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { updateTestUserEmails };


