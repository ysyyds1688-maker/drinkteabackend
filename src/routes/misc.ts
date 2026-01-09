// backend/src/routes/misc.ts
import { Router } from 'express';
import multer from 'multer';
import { storageService } from '../services/storageService.js';
import { auth } from '../middleware/auth.js'; // 假設只有登入用戶才能上傳圖片

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload/image - 上傳單個圖片
// 僅限登入用戶
router.post('/upload/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageUrl = await storageService.uploadImage(req.file.buffer, req.file.originalname);

    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

export default router;




