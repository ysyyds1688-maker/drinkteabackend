import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

// 移除 client@test.com 的標記
async function removeClientBadges() {
  try {
    console.log('🔄 開始移除 client@test.com 的標記...\n');

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
    console.log(`   失約次數: ${user.noShowCount || 0}`);
    console.log(`   違規級別: ${user.violationLevel || 0}`);
    console.log(`   失信茶客標記: ${user.warningBadge ? '是' : '否'}`);
    console.log(`   失約茶客標記: ${user.noShowBadge ? '是' : '否'}`);

    // 移除所有標記和計數
    const updateResult = await query(`
      UPDATE users
      SET booking_cancellation_count = 0,
          no_show_count = 0,
          violation_level = 0,
          warning_badge = FALSE,
          no_show_badge = FALSE,
          booking_warning = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    console.log(`\n✅ UPDATE 查詢執行結果: ${updateResult.rowCount} 行已更新`);

    // 刪除所有相關的 booking_restrictions 記錄
    const deleteRestrictionsResult = await query(`
      DELETE FROM booking_restrictions
      WHERE user_id = $1
    `, [user.id]);

    console.log(`✅ 刪除預約限制記錄: ${deleteRestrictionsResult.rowCount || 0} 筆`);

    // 驗證更新
    const updatedUser = await userModel.findById(user.id);
    if (updatedUser) {
      console.log(`\n📋 更新後的用戶資訊:`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   取消次數: ${updatedUser.bookingCancellationCount || 0}`);
      console.log(`   失約次數: ${updatedUser.noShowCount || 0}`);
      console.log(`   違規級別: ${updatedUser.violationLevel || 0}`);
      console.log(`   失信茶客標記: ${updatedUser.warningBadge ? '是' : '否'}`);
      console.log(`   失約茶客標記: ${updatedUser.noShowBadge ? '是' : '否'}`);
    }

    console.log('\n✅ 標記移除完成！現在 client@test.com 應該不會顯示任何標記了。\n');

  } catch (error: any) {
    console.error('❌ 移除標記失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('removeClientBadges')) {
  removeClientBadges()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { removeClientBadges };


