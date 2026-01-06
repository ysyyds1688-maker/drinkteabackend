import { userModel } from '../models/User.js';

async function setClientVerification() {
  try {
    console.log('🔍 正在查找 client@teakingom.com...\n');
    
    const user = await userModel.findByEmailOrPhone('client@teakingom.com');
    
    if (!user) {
      console.error('❌ 找不到用戶 client@teakingom.com');
      return;
    }
    
    console.log('📋 當前用戶資訊:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email || '無'}`);
    console.log(`   手機號: ${user.phoneNumber || '無'}`);
    console.log(`   Email 驗證狀態: ${user.emailVerified ? '✅ 已驗證' : '❌ 未驗證'}`);
    console.log(`   手機驗證狀態: ${user.phoneVerified ? '✅ 已驗證' : '❌ 未驗證'}`);
    console.log(`   驗證徽章: ${user.verificationBadges?.join(', ') || '無'}\n`);
    
    // 設置 email 和手機號碼（如果還沒有）
    const { query } = await import('../db/database.js');
    
    if (!user.email) {
      console.log('📧 設置 Email: client@teakingom.com');
      await query(
        'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['client@teakingom.com', user.id]
      );
    }
    
    if (!user.phoneNumber) {
      console.log('📱 設置手機號碼: 0912345678');
      await query(
        'UPDATE users SET phone_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['0912345678', user.id]
      );
    }
    
    // 驗證 email
    if (!user.emailVerified) {
      console.log('✅ 驗證 Email...');
      await userModel.updateEmailVerified(user.id, true);
    }
    
    // 驗證手機號碼
    if (!user.phoneVerified) {
      console.log('✅ 驗證手機號碼...');
      await userModel.updatePhoneVerified(user.id, true);
    }
    
    // 重新獲取用戶資訊以確認
    const updatedUser = await userModel.findById(user.id);
    
    if (updatedUser) {
      console.log('\n✅ 更新完成！\n');
      console.log('📋 更新後的用戶資訊:');
      console.log(`   Email: ${updatedUser.email || '無'}`);
      console.log(`   手機號: ${updatedUser.phoneNumber || '無'}`);
      console.log(`   Email 驗證狀態: ${updatedUser.emailVerified ? '✅ 已驗證' : '❌ 未驗證'}`);
      console.log(`   手機驗證狀態: ${updatedUser.phoneVerified ? '✅ 已驗證' : '❌ 未驗證'}`);
      console.log(`   驗證徽章: ${updatedUser.verificationBadges?.join(', ') || '無'}`);
      
      if (updatedUser.emailVerified && updatedUser.phoneVerified) {
        console.log('\n🎉 用戶已完全驗證，應該可以看到藍色驗證徽章！');
      }
    } else {
      console.error('❌ 更新後無法找到用戶');
    }
    
    console.log('\n✅ 處理完成！');
  } catch (error: any) {
    console.error('❌ 設置用戶驗證失敗:', error);
    process.exit(1);
  }
}

// 如果直接運行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  setClientVerification().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { setClientVerification };

