import { initDatabase } from '../db/database.js';
import { userModel } from '../models/User.js';
import { query } from '../db/database.js';

// 設置 admin@teakingom.com 的管理員權限和信箱驗證
async function setupAdminPermissions() {
  try {
    console.log('🚀 開始設置管理員權限和信箱驗證...\n');

    // 初始化資料庫
    await initDatabase();

    const email = 'admin@teakingom.com';

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      console.log('💡 提示: 請先運行 npm run init:users 創建測試用戶');
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${user.userName || user.email} (ID: ${user.id})`);
    console.log(`📋 當前狀態:`);
    console.log(`   - 角色: ${user.role}`);
    console.log(`   - 信箱驗證: ${user.emailVerified ? '已驗證' : '未驗證'}`);

    // 更新角色為 admin 和設置信箱驗證
    await query(`
      UPDATE users 
      SET role = 'admin', 
          email_verified = TRUE, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    console.log(`\n✅ 已設置:`);
    console.log(`   - 角色: admin`);
    console.log(`   - 信箱驗證: 已驗證`);

    // 驗證更新
    const updatedUser = await userModel.findById(user.id);
    if (updatedUser) {
      console.log(`\n📋 更新後的用戶資訊:`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   角色: ${updatedUser.role}`);
      console.log(`   信箱驗證: ${updatedUser.emailVerified ? '已驗證' : '未驗證'}`);
    }

    console.log('\n✅ 設置完成！\n');

  } catch (error: any) {
    console.error('❌ 設置失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('setupAdminPermissions')) {
  setupAdminPermissions()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { setupAdminPermissions };

