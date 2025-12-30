// 必须在导入其他模块之前加载环境变量
import dotenv from 'dotenv';
dotenv.config();

import { initDatabase } from '../db/database.js';
import { articleModel } from '../models/Article.js';
import * as fs from 'fs';

// 图片文件列表（从指定文件夹）
const IMAGE_FOLDER = '/Users/user/Downloads/drinkstea-main/frontend/public/images/茶訊公告';
const IMAGE_BASE_URL = '/images/茶訊公告';

// 获取所有图片文件名
function getImageFiles(): string[] {
  try {
    const files = fs.readdirSync(IMAGE_FOLDER);
    return files
      .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') || file.toLowerCase().endsWith('.png'))
      .filter(file => !file.startsWith('.')); // 排除隐藏文件
  } catch (error) {
    console.error('读取图片文件夹失败:', error);
    return [];
  }
}

// 为文章分配图片
async function assignArticleImages() {
  try {
    console.log('🚀 开始为文章分配图片...\n');

    // 初始化数据库连接
    await initDatabase();

    // 获取所有文章
    const articles = await articleModel.getAll();
    console.log(`📰 找到 ${articles.length} 篇文章\n`);

    if (articles.length === 0) {
      console.log('⚠️  没有找到文章，请先创建文章');
      process.exit(0);
    }

    // 获取所有可用图片
    const imageFiles = getImageFiles();
    console.log(`🖼️  找到 ${imageFiles.length} 张图片:`);
    imageFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    if (imageFiles.length === 0) {
      console.log('⚠️  没有找到图片文件');
      process.exit(1);
    }

    // 记录已使用的图片
    const usedImages: Array<{ articleId: string; articleTitle: string; imageFile: string }> = [];

    // 为每篇文章分配图片（强制更新所有文章的图片）
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      // 使用文章ID的hash来确保每次运行结果一致（固定分配）
      // 将文章ID转换为数字，然后取模来选择图片
      let hash = 0;
      for (let j = 0; j < article.id.length; j++) {
        hash = ((hash << 5) - hash) + article.id.charCodeAt(j);
        hash = hash & hash; // Convert to 32bit integer
      }
      const imageIndex = Math.abs(hash) % imageFiles.length;
      const selectedImage = imageFiles[imageIndex];
      const imageUrl = `${IMAGE_BASE_URL}/${selectedImage}`;

      // 更新文章图片
      await articleModel.update(article.id, {
        imageUrl: imageUrl
      });

      console.log(`✓ 为文章 "${article.title}" 分配图片: ${selectedImage}`);
      
      usedImages.push({
        articleId: article.id,
        articleTitle: article.title,
        imageFile: selectedImage
      });
    }

    console.log('\n📊 分配结果汇总:');
    console.log('='.repeat(80));
    console.log('已使用的图片:');
    usedImages.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.imageFile} → "${item.articleTitle}" (ID: ${item.articleId})`);
    });
    console.log('='.repeat(80));

    // 统计每张图片的使用次数
    const imageUsage: Record<string, number> = {};
    usedImages.forEach(item => {
      imageUsage[item.imageFile] = (imageUsage[item.imageFile] || 0) + 1;
    });

    console.log('\n📈 图片使用统计:');
    imageFiles.forEach(file => {
      const count = imageUsage[file] || 0;
      console.log(`  ${file}: ${count} 次`);
    });

    console.log('\n✅ 图片分配完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 分配图片失败:', error);
    process.exit(1);
  }
}

// 运行脚本
assignArticleImages();

