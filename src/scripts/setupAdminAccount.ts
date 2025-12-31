import { userModel } from '../models/User.js';
import { userStatsModel } from '../models/UserStats.js';
import { achievementModel } from '../models/Achievement.js';
import { ACHIEVEMENT_DEFINITIONS } from '../models/Achievement.js';
import { initDatabase } from '../db/database.js';
import { query } from '../db/database.js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

async function setupAdminAccount() {
  try {
    console.log('🚀 開始設置管理員帳號...');
    await initDatabase();

    const email = 'admin@test.com';

    // 查找管理員用戶
    const user = await userModel.findByEmailOrPhone(email);
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${user.userName || user.email} (ID: ${user.id}, Role: ${user.role})`);

    // 1. 設置會員等級為「國師級茶官」
    const targetLevel = 'national_master_tea_officer';
    const targetExperience = 1000000; // 國師級茶官需要100萬經驗值
    
    // 獲取或創建用戶統計
    const stats = await userStatsModel.getOrCreate(user.id);
    console.log(`📊 當前狀態:`);
    console.log(`   - 積分: ${stats.currentPoints}`);
    console.log(`   - 經驗值: ${stats.experiencePoints}`);
    console.log(`   - 會員等級: ${user.membershipLevel}`);

    // 設置經驗值（確保達到國師級茶官門檻）
    await query(`
      UPDATE user_stats 
      SET experience_points = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [targetExperience, user.id]);

    // 設置會員等級
    await userModel.updateMembership(user.id, targetLevel);

    console.log(`✅ 已設置會員等級為「國師級茶官」`);
    console.log(`✅ 已設置經驗值為 ${targetExperience.toLocaleString()}`);

    // 2. 添加10萬積分
    const pointsToAdd = 100000;
    await userStatsModel.addPoints(user.id, pointsToAdd, 0);
    console.log(`✅ 已添加 ${pointsToAdd.toLocaleString()} 積分`);

    // 3. 隨機選擇8個成就並解鎖
    const allAchievements = ACHIEVEMENT_DEFINITIONS;
    
    // 獲取已解鎖的成就
    const unlockedAchievements = await achievementModel.getUserAchievements(user.id);
    const unlockedTypes = new Set(unlockedAchievements.map(a => a.achievementType));
    
    // 過濾出未解鎖的成就
    const availableAchievements = allAchievements.filter(a => !unlockedTypes.has(a.type));
    
    // 隨機選擇8個（如果可用成就少於8個，則全部選擇）
    const achievementsToUnlock = availableAchievements
      .sort(() => Math.random() - 0.5) // 隨機排序
      .slice(0, Math.min(8, availableAchievements.length));

    console.log(`\n🎯 準備解鎖 ${achievementsToUnlock.length} 個成就:`);
    
    for (const achievement of achievementsToUnlock) {
      const id = `ach_${Date.now()}_${uuidv4().substring(0, 9)}`;
      
      await query(`
        INSERT INTO achievements (id, user_id, achievement_type, achievement_name, points_earned, experience_earned, unlocked_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        id,
        user.id,
        achievement.type,
        achievement.name,
        achievement.pointsReward || 0,
        achievement.experienceReward || 0,
      ]);

      console.log(`   ✅ 解鎖成就: ${achievement.name} (${achievement.type})`);

      // 發放成就獎勵（如果有的話）
      if (achievement.pointsReward || achievement.experienceReward) {
        await userStatsModel.addPoints(
          user.id,
          achievement.pointsReward || 0,
          achievement.experienceReward || 0
        );
      }

      // 創建成就解鎖通知
      try {
        const { notificationModel } = await import('../models/Notification.js');
        await notificationModel.create({
          userId: user.id,
          type: 'achievement',
          title: '成就解鎖',
          content: `恭喜您解鎖了「${achievement.name}」成就！${achievement.pointsReward > 0 ? `獲得 ${achievement.pointsReward} 積分，` : ''}${achievement.experienceReward > 0 ? `獲得 ${achievement.experienceReward} 經驗值。` : ''}`,
          link: `/user-profile?tab=achievements`,
          metadata: {
            achievementId: id,
            achievementType: achievement.type,
            achievementName: achievement.name,
          },
        });
      } catch (error) {
        console.error(`    ⚠️  創建通知失敗: ${error}`);
      }
    }

    // 最後更新會員等級（因為經驗值可能因為成就獎勵而增加）
    const finalStats = await userStatsModel.getByUserId(user.id);
    if (finalStats) {
      const { getLevelFromExperience } = await import('../models/UserStats.js');
      const finalLevel = await getLevelFromExperience(user.id, finalStats.experiencePoints);
      await userModel.updateMembership(user.id, finalLevel);
      console.log(`\n📈 最終等級: ${finalLevel}`);
    }

    // 顯示最終狀態
    const finalUserStats = await userStatsModel.getByUserId(user.id);
    const finalUser = await userModel.findById(user.id);

    console.log(`\n✅ 設置完成！`);
    console.log(`📊 最終狀態:`);
    console.log(`   - 會員等級: ${finalUser?.membershipLevel} (國師級茶官)`);
    console.log(`   - 積分: ${finalUserStats?.currentPoints?.toLocaleString()}`);
    console.log(`   - 總積分: ${finalUserStats?.totalPoints?.toLocaleString()}`);
    console.log(`   - 經驗值: ${finalUserStats?.experiencePoints?.toLocaleString()}`);
    console.log(`   - 已解鎖成就數: ${unlockedAchievements.length + achievementsToUnlock.length}`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    console.error(error);
    process.exit(1);
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('setupAdminAccount')) {
  setupAdminAccount();
}

export { setupAdminAccount };

