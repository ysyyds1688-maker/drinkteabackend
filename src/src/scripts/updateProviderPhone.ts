import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

// 生成隨機台灣手機號（09XXXXXXXX）
function generateRandomPhoneNumber(): string {
  // 台灣手機號格式：09XXXXXXXX（10位數）
  const prefix = '09';
  const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
  return prefix + randomDigits.substring(0, 8);
}

// 更新 provider@test.com 的手機號為隨機亂數
async function updateProviderPhone() {
  try {
    console.log('🔄 開始更新 provider@test.com 的手機號...\n');

    // 初始化資料庫
    await initDatabase();

    const email = 'provider@test.com';

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${user.userName || user.email} (ID: ${user.id}, Role: ${user.role})`);
    console.log(`📱 當前手機號: ${user.phoneNumber || '無'}`);

    // 生成隨機手機號
    const randomPhone = generateRandomPhoneNumber();
    console.log(`🎲 生成隨機手機號: ${randomPhone}`);

    // 更新手機號
    await query(
      'UPDATE users SET phone_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [randomPhone, user.id]
    );

    console.log(`✅ 已更新手機號為: ${randomPhone}`);

    // 驗證更新
    const updatedUser = await userModel.findById(user.id);
    if (updatedUser) {
      console.log(`\n📋 更新後的用戶資訊:`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   手機號: ${updatedUser.phoneNumber || '無'}`);
      console.log(`   手機驗證狀態: ${updatedUser.phoneVerified ? '已驗證' : '未驗證'}`);
    }

    console.log('\n✅ 更新完成！\n');

  } catch (error: any) {
    console.error('❌ 更新手機號失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('updateProviderPhone')) {
  updateProviderPhone()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { updateProviderPhone };

