import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';
import bcrypt from 'bcrypt';

// 更新測試用戶密碼
async function updateUserPasswords() {
  try {
    console.log('🔄 開始更新測試用戶密碼...\n');

    // 初始化資料庫
    await initDatabase();

    // 測試用戶數據（新密碼）
    const testUsers = [
      {
        email: 'admin@test.com',
        password: '#admintea5469!',
        role: 'admin' as const,
      },
      {
        email: 'provider@test.com',
        password: 'provider69169#',
        role: 'provider' as const,
      },
      {
        email: 'client@test.com',
        password: 'client696968#',
        role: 'client' as const,
      },
    ];

    let updated = 0;
    let created = 0;

    for (const userData of testUsers) {
      try {
        // 檢查用戶是否已存在
        const existing = await userModel.findByEmailOrPhone(userData.email);
        
        if (existing) {
          // 更新密碼
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, existing.id]
          );
          console.log(`  ✅ 更新用戶密碼: ${userData.email} (${userData.role})`);
          updated++;
        } else {
          // 創建用戶
          await userModel.create({
            email: userData.email,
            password: userData.password,
            role: userData.role,
          });
          console.log(`  ✅ 創建用戶: ${userData.email} (${userData.role})`);
          created++;
        }
      } catch (error: any) {
        console.error(`  ❌ 處理用戶失敗 ${userData.email}:`, error.message);
      }
    }

    console.log(`\n✅ 測試用戶密碼更新完成: 更新 ${updated} 個, 創建 ${created} 個\n`);
    console.log('📋 測試帳號信息:');
    console.log('   Admin (管理員):');
    console.log('     Email: admin@test.com');
    console.log('     密碼: #admintea5469!');
    console.log('   Provider (後宮佳麗):');
    console.log('     Email: provider@test.com');
    console.log('     密碼: provider69169#');
    console.log('   Client (品茶客):');
    console.log('     Email: client@test.com');
    console.log('     密碼: client696968#');
    console.log('');

  } catch (error: any) {
    console.error('❌ 更新測試用戶密碼失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('updateUserPasswords')) {
  updateUserPasswords()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { updateUserPasswords };

