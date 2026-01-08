// backend/src/services/storageService.ts
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:8080/uploads'; // 默認為本地上傳路徑

// 確保上傳目錄存在
const UPLOAD_DIR = join(process.cwd(), 'uploads');

const ensureUploadDir = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('創建上傳目錄失敗:', error);
  }
};

export const storageService = {
  async uploadImage(buffer: Buffer, originalname: string): Promise<string> {
    await ensureUploadDir();

    const fileExtension = extname(originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, buffer);

    // 返回一個模擬的 CDN URL
    return `${CDN_BASE_URL}/${filename}`;
  },

  async deleteImage(imageUrl: string): Promise<boolean> {
    // 從 URL 中解析文件名
    const filename = imageUrl.split('/').pop();
    if (!filename) return false;

    const filePath = join(UPLOAD_DIR, filename);

    try {
      await fs.unlink(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`文件不存在，無法刪除: ${filePath}`);
        return false;
      }
      console.error(`刪除文件失敗: ${filePath}`, error);
      return false;
    }
  },
};

