import { userModel } from '../models/User.js';
import { subscriptionModel } from '../models/Subscription.js';
import { query } from '../db/database.js';
import type { LadyMembershipLevel } from '../models/User.js';

async function setTaipeiProviderVip() {
  try {
    console.log('🔍 正在查找「台北菜一林」用戶...\n');
    
    // 先查找用戶名包含「台北菜一林」或用戶名包含「菜一林」的用戶
    const users = await userModel.getAll();
    const targetUser = users.find(u => 
      u.userName?.includes('台北菜一林') || 
      u.userName?.includes('菜一林') ||
      u.email?.includes('台北菜一林') ||
      u.email?.includes('菜一林')
    );
    
    if (!targetUser) {
      console.error('❌ 找不到用戶「台北菜一林」');
      console.log('\n📋 所有 provider 用戶列表:');
      users.forEach(u => {
        if (u.role === 'provider') {
          console.log(`   - ${u.userName || '無名稱'} (${u.email || u.phoneNumber || '無聯絡方式'}) [ID: ${u.id}]`);
        }
      });
      return;
    }
    
    console.log('📋 當前用戶資訊:');
    console.log(`   ID: ${targetUser.id}`);
    console.log(`   用戶名: ${targetUser.userName || '無'}`);
    console.log(`   Email: ${targetUser.email || '無'}`);
    console.log(`   手機號: ${targetUser.phoneNumber || '無'}`);
    console.log(`   角色: ${targetUser.role}`);
    console.log(`   會員等級: ${targetUser.membershipLevel}\n`);
    
    if (targetUser.role !== 'provider') {
      console.error('❌ 該用戶不是 provider 角色');
      return;
    }
    
    // 檢查是否已有活躍訂閱
    const existingSubscription = await subscriptionModel.getActiveByUserId(targetUser.id);
    if (existingSubscription) {
      console.log('⚠️  用戶已有活躍訂閱，將更新現有訂閱...');
      // 停用現有訂閱
      await query(
        `UPDATE subscriptions SET is_active = FALSE WHERE id = $1`,
        [existingSubscription.id]
      );
    }
    
    // 創建 VIP 訂閱（一年）
    console.log('💎 創建 VIP 訂閱（一年）...');
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    
    await subscriptionModel.create({
      userId: targetUser.id,
      membershipLevel: 'tea_scholar', // VIP 訂閱使用 tea_scholar 等級
      expiresAt: expiresAt
    });
    
    // 升級到「鑽石佳麗」(lady_premium)
    console.log('💎 升級到「鑽石佳麗」(lady_premium)...');
    await userModel.updateMembership(targetUser.id, 'lady_premium' as any);
    
    // 重新獲取用戶資訊以確認
    const updatedUser = await userModel.findById(targetUser.id);
    const newSubscription = await subscriptionModel.getActiveByUserId(targetUser.id);
    
    if (updatedUser && newSubscription) {
      console.log('\n✅ 更新完成！\n');
      console.log('📋 更新後的用戶資訊:');
      console.log(`   用戶名: ${updatedUser.userName || '無'}`);
      console.log(`   會員等級: ${updatedUser.membershipLevel}`);
      console.log(`   VIP 訂閱: ✅ 活躍 (到期日: ${newSubscription.expiresAt || '永久'})`);
      
      if ((updatedUser.membershipLevel as LadyMembershipLevel) === 'lady_premium' && newSubscription.isActive) {
        console.log('\n🎉 用戶已成功設置為 VIP 並升級到「鑽石佳麗」！');
      }
    } else {
      console.error('❌ 更新後無法找到用戶或訂閱');
    }
    
    console.log('\n✅ 處理完成！');
  } catch (error: any) {
    console.error('❌ 設置用戶 VIP 失敗:', error);
    process.exit(1);
  }
}

// 如果直接運行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  setTaipeiProviderVip().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { setTaipeiProviderVip };

