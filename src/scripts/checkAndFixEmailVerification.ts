import { query } from '../db/database.js';
import { userModel } from '../models/User.js';

async function checkAndFixEmailVerification() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('請提供 email 地址');
    console.log('用法: npm run check-email-verification <email>');
    process.exit(1);
  }

  try {
    console.log(`\n檢查用戶 ${email} 的 email 驗證狀態...\n`);

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    
    if (!user) {
      console.error(`❌ 找不到 email 為 ${email} 的用戶`);
      process.exit(1);
    }

    console.log('用戶信息:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    console.log(`  Phone Verified: ${user.phoneVerified}`);
    console.log(`  Verification Badges: ${JSON.stringify(user.verificationBadges || [])}`);

    // 檢查數據庫中的實際值
    const dbResult = await query(
      'SELECT email_verified, phone_verified, verification_badges FROM users WHERE id = $1',
      [user.id]
    );

    if (dbResult.rows.length > 0) {
      const row = dbResult.rows[0];
      console.log('\n數據庫中的實際值:');
      console.log(`  email_verified: ${row.email_verified} (類型: ${typeof row.email_verified})`);
      console.log(`  phone_verified: ${row.phone_verified} (類型: ${typeof row.phone_verified})`);
      console.log(`  verification_badges: ${row.verification_badges}`);

      // 如果 email_verified 為 false，詢問是否要修復
      if (!row.email_verified && user.email) {
        console.log('\n⚠️  檢測到 email_verified 為 false，但用戶有 email 地址');
        console.log('正在修復 email 驗證狀態...');
        
        await userModel.updateEmailVerified(user.id, true);
        
        // 重新獲取用戶信息確認
        const updatedUser = await userModel.findById(user.id);
        if (updatedUser) {
          console.log('\n✅ 修復完成！');
          console.log(`  Email Verified: ${updatedUser.emailVerified}`);
          console.log(`  Verification Badges: ${JSON.stringify(updatedUser.verificationBadges || [])}`);
        }
      } else if (row.email_verified) {
        console.log('\n✅ Email 驗證狀態正常');
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAndFixEmailVerification();

