import { initDatabase } from '../db/database.js';
import { userModel } from '../models/User.js';

// 初始化测试用户
async function initTestUsers() {
  try {
    console.log('🔄 开始初始化测试用户...\n');

    // 初始化数据库（确保表存在）
    await initDatabase();

    // 测试用户数据
    const testUsers = [
      {
        email: 'admin@test.com',
        password: 'admin123',
        role: 'admin' as const,
      },
      {
        email: 'provider@test.com',
        password: 'provider123',
        role: 'provider' as const,
      },
      {
        email: 'client@test.com',
        password: 'client123',
        role: 'client' as const,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const userData of testUsers) {
      try {
        // 检查用户是否已存在
        const existing = await userModel.findByEmailOrPhone(userData.email);
        
        if (existing) {
          console.log(`  ⏭️  用户已存在: ${userData.email} (${userData.role})`);
          skipped++;
        } else {
          // 创建用户
          await userModel.create({
            email: userData.email,
            password: userData.password,
            role: userData.role,
          });
          console.log(`  ✅ 创建用户: ${userData.email} (${userData.role})`);
          created++;
        }
      } catch (error: any) {
        console.error(`  ❌ 创建用户失败 ${userData.email}:`, error.message);
      }
    }

    console.log(`\n✅ 测试用户初始化完成: 创建 ${created} 个, 跳过 ${skipped} 个\n`);
    console.log('📋 测试账号信息:');
    console.log('   Admin (管理員):');
    console.log('     Email: admin@test.com');
    console.log('     密码: admin123');
    console.log('   Provider (小姐):');
    console.log('     Email: provider@test.com');
    console.log('     密码: provider123');
    console.log('   Client (客戶):');
    console.log('     Email: client@test.com');
    console.log('     密码: client123');
    console.log('');

  } catch (error: any) {
    console.error('❌ 初始化测试用户失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('initTestUsers')) {
  initTestUsers()
    .then(() => {
      console.log('🎉 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 错误:', error);
      process.exit(1);
    });
}

export { initTestUsers };

