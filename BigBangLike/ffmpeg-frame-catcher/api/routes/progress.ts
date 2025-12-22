import express from 'express';
import { taskService } from '../services/taskService';

import { DataSource } from '../lib/db/DbFactory';

const router = express.Router();

// 查询任务进度
router.get('/progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const dataSource = (req.query.dataSource as DataSource) || 'supabase';
    
    const task = await taskService.getTask(taskId, dataSource);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // 计算预估剩余时间（秒）
    let estimatedTime = 0;
    if (task.status === 'processing' && task.progress > 0 && task.total_frames > 0) {
      // 简单的线性估算：基于当前进度和处理时间
      const processingTime = (Date.now() - new Date(task.created_at).getTime()) / 1000;
      const estimatedTotalTime = processingTime / (task.progress / 100);
      estimatedTime = Math.max(0, estimatedTotalTime - processingTime);
    }
    
    // 禁用缓存，确保前端总是获取最新进度
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      currentFrame: Math.floor((task.progress / 100) * task.total_frames),
      totalFrames: task.total_frames,
      estimatedTime: Math.round(estimatedTime)
    });
  } catch (error) {
    console.error('Progress query error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

export default router;