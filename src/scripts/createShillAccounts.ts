import { userModel } from '../models/User.js';
import { query } from '../db/database.js';

// 生成隨機手機號碼（09開頭 + 8位數字）
const generatePhoneNumber = (): string => {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000); // 8位隨機數字
  return `09${randomNum}`;
};

// 水軍帳號配置
const shillAccounts = [
  // 品茶客
  {
    email: 'client01@teakingom.com',
    password: 'client1165@!',
    role: 'client' as const,
  },
  {
    email: 'client02@teakingom.com',
    password: 'client9898520#@',
    role: 'client' as const,
  },
  {
    email: 'client03@teakingom.com',
    password: '03client5206969@',
    role: 'client' as const,
  },
  // 佳麗
  {
    email: 'provider01@teakingom.com',
    password: '01pro5269voder@',
    role: 'provider' as const,
  },
  {
    email: 'provider02@teakingom.com',
    password: '02pro!@698voder',
    role: 'provider' as const,
  },
  {
    email: 'provider03@teakingom.com',
    password: '03pro!520voder!!',
    role: 'provider' as const,
  },
];

async function createShillAccounts() {
  console.log('開始創建水軍帳號...\n');

  const results: Array<{ email: string; success: boolean; userId?: string; phoneNumber?: string; error?: string }> = [];

  for (const account of shillAccounts) {
    try {
      // 檢查用戶是否已存在
      const existing = await userModel.findByEmailOrPhone(account.email);
      if (existing) {
        console.log(`⚠️  帳號 ${account.email} 已存在，跳過`);
        results.push({
          email: account.email,
          success: false,
          error: '帳號已存在',
        });
        continue;
      }

      // 生成手機號碼（確保唯一）
      let phoneNumber = generatePhoneNumber();
      let attempts = 0;
      while (attempts < 10) {
        const phoneExists = await userModel.findByEmailOrPhone(undefined, phoneNumber);
        if (!phoneExists) {
          break;
        }
        phoneNumber = generatePhoneNumber();
        attempts++;
      }

      // 創建用戶
      const user = await userModel.create({
        email: account.email,
        phoneNumber: phoneNumber,
        password: account.password,
        role: account.role,
      });

      // 設置 Email 驗證狀態
      await userModel.updateEmailVerified(user.id, true);

      // 設置手機驗證狀態
      await userModel.updatePhoneVerified(user.id, true);

      // 生成 public_id（如果還沒有）
      let finalPublicId = user.publicId;
      if (!user.publicId) {
        finalPublicId = await userModel.generateUserId(account.role);
        await query(
          `UPDATE users SET public_id = $1 WHERE id = $2`,
          [finalPublicId, user.id]
        );
        // 重新獲取用戶信息以確認
        const updatedUser = await userModel.findById(user.id);
        finalPublicId = updatedUser?.publicId || finalPublicId;
      }

      console.log(`✅ 成功創建帳號：${account.email}`);
      console.log(`   - 用戶ID: ${user.id}`);
      console.log(`   - 公開ID: ${finalPublicId || user.id}`);
      console.log(`   - 手機號碼: ${phoneNumber}`);
      console.log(`   - 角色: ${account.role}`);
      console.log(`   - Email 驗證: ✅`);
      console.log(`   - 手機驗證: ✅\n`);

      results.push({
        email: account.email,
        success: true,
        userId: user.id,
        phoneNumber: phoneNumber,
      });
    } catch (error: any) {
      console.error(`❌ 創建帳號 ${account.email} 失敗:`, error.message);
      results.push({
        email: account.email,
        success: false,
        error: error.message,
      });
    }
  }

  // 輸出總結
  console.log('\n========== 創建結果總結 ==========');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`✅ 成功: ${successCount} 個`);
  console.log(`❌ 失敗: ${failCount} 個`);
  
  if (successCount > 0) {
    console.log('\n成功創建的帳號：');
    results.filter(r => r.success).forEach(r => {
      console.log(`  - ${r.email} (${r.userId}) - 手機: ${r.phoneNumber}`);
    });
  }
  
  if (failCount > 0) {
    console.log('\n失敗的帳號：');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.email}: ${r.error}`);
    });
  }

  console.log('\n===================================');
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])) {
  createShillAccounts()
    .then(() => {
      console.log('\n腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('腳本執行失敗:', error);
      process.exit(1);
    });
}

export { createShillAccounts };

