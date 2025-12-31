import { query } from './database.js';

async function addImagesColumn() {
  try {
    // 檢查欄位是否已存在
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'forum_posts' 
      AND column_name = 'images'
    `);
    
    if (checkResult.rows.length === 0) {
      // 添加 images 欄位
      await query(`
        ALTER TABLE forum_posts 
        ADD COLUMN images TEXT
      `);
      console.log('✅ 已添加 forum_posts.images 欄位');
    } else {
      console.log('ℹ️  forum_posts.images 欄位已存在');
    }
  } catch (error: any) {
    console.error('❌ 添加欄位失敗:', error.message);
  }
}

addImagesColumn().then(() => process.exit(0));
