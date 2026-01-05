import { initDatabase } from '../db/database.js';
import { userModel } from '../models/User.js';

async function fixUserPhone() {
  try {
    console.log('🔄 開始修正 wuc714168@gmail.com 的手機號碼...');
    await initDatabase();

    // 先嘗試用 email 查找
    let user = await userModel.findByEmailOrPhone('wuc714168@gmail.com');
    
    // 如果找不到，嘗試用 phoneNumber 查找（因為可能手機號欄位填了 email）
    if (!user) {
      const allUsers = await userModel.getAll();
      user = allUsers.find(u => u.phoneNumber === 'wuc714168@gmail.com');
    }

    if (!user) {
      console.error(`❌ 找不到用戶: wuc714168@gmail.com`);
      return;
    }

    console.log(`✅ 找到用戶: ${user.userName || user.email} (ID: ${user.id})`);
    console.log(`📱 當前手機號: ${user.phoneNumber || '無'}`);
    console.log(`📧 當前 Email: ${user.email || '無'}`);

    // 檢查手機號碼欄位是否包含 email
    if (user.phoneNumber && user.phoneNumber.includes('@')) {
      console.log(`⚠️  發現手機號碼欄位包含 email，正在修正...`);
      
      // 先將 email 設為正確的值（從 phoneNumber 複製）
      // 然後清空 phoneNumber
      // 因為資料庫約束要求 email 或 phone_number 至少有一個不為 NULL
      const { query } = await import('../db/database.js');
      await query(
        'UPDATE users SET email = $1, phone_number = NULL, phone_verified = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [user.phoneNumber, user.id]
      );
      
      const updatedUser = await userModel.findById(user.id);

      if (updatedUser) {
        console.log(`✅ 已修正：手機號碼欄位已清空`);
        console.log(`\n📋 修正後的用戶資訊:`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   手機號: ${updatedUser.phoneNumber || '無'}`);
        console.log(`   手機驗證狀態: ${updatedUser.phoneVerified ? '已驗證' : '未驗證'}`);
      } else {
        console.error('❌ 修正失敗');
      }
    } else {
      console.log(`ℹ️  手機號碼欄位正常，無需修正`);
    }

    console.log('\n✅ 處理完成！');
  } catch (error: any) {
    console.error('❌ 修正用戶手機號失敗:', error);
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('fixUserPhone')) {
  fixUserPhone()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { fixUserPhone };

