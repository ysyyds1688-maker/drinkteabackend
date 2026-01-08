import { Router } from 'express';
import { getPerformanceStats, clearPerformanceMetrics } from '../middleware/performanceMonitor.js';
import { getUserFromRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/performance/stats - 獲取性能統計（僅管理員）
router.get('/stats', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可查看性能統計' });
    }

    const stats = getPerformanceStats();
    res.json(stats);
  } catch (error: any) {
    console.error('獲取性能統計失敗:', error);
    res.status(500).json({ error: error.message || '獲取性能統計失敗' });
  }
});

// DELETE /api/performance/stats - 清空性能統計（僅管理員）
router.delete('/stats', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可清空性能統計' });
    }

    clearPerformanceMetrics();
    res.json({ message: '性能統計已清空' });
  } catch (error: any) {
    console.error('清空性能統計失敗:', error);
    res.status(500).json({ error: error.message || '清空性能統計失敗' });
  }
});

export default router;


