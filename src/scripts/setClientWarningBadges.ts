import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

// 為 client@test.com 設置警告標記和放鳥標記
async function setClientWarningBadges() {
  try {
    console.log('🔄 開始為 client@test.com 設置警告標記和放鳥標記...\n');

    // 初始化資料庫
    await initDatabase();

    const email = 'client@test.com';

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${user.userName || user.email} (ID: ${user.id}, Role: ${user.role})`);
    console.log(`📊 當前狀態:`);
    console.log(`   取消次數: ${user.bookingCancellationCount || 0}`);
    console.log(`   放鳥次數: ${user.noShowCount || 0}`);
    console.log(`   違規級別: ${user.violationLevel || 0}`);
    console.log(`   警告標記: ${user.warningBadge ? '是' : '否'}`);
    console.log(`   放鳥標記: ${user.noShowBadge ? '是' : '否'}`);

    // 設置數據以觸發警告標記和放鳥標記
    // 根據規則：
    // - 警告標記：累犯第一次（總計6次取消）開始顯示
    // - 放鳥標記：3次放鳥開始顯示
    const updateResult = await query(`
      UPDATE users
      SET booking_cancellation_count = 6,
          no_show_count = 3,
          violation_level = 2,
          warning_badge = TRUE,
          no_show_badge = TRUE,
          booking_warning = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    console.log(`\n✅ UPDATE 查詢執行結果: ${updateResult.rowCount} 行已更新`);

    // 驗證更新
    const updatedUser = await userModel.findById(user.id);
    if (updatedUser) {
      console.log(`\n📋 更新後的用戶資訊:`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   取消次數: ${updatedUser.bookingCancellationCount || 0}`);
      console.log(`   放鳥次數: ${updatedUser.noShowCount || 0}`);
      console.log(`   違規級別: ${updatedUser.violationLevel || 0}`);
      console.log(`   警告標記: ${updatedUser.warningBadge ? '是' : '否'}`);
      console.log(`   放鳥標記: ${updatedUser.noShowBadge ? '是' : '否'}`);
    }

    console.log('\n✅ 更新完成！現在 client@test.com 應該會顯示警告標記和放鳥標記。\n');

  } catch (error: any) {
    console.error('❌ 設置標記失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('setClientWarningBadges')) {
  setClientWarningBadges()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { setClientWarningBadges };

