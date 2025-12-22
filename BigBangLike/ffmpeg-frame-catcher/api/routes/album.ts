import express from 'express';
import { taskService } from '../services/taskService';

import { DataSource } from '../lib/db/DbFactory';

const router = express.Router();

// 获取相册信息和图片列表
router.get('/album/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    const dataSource = (req.query.dataSource as DataSource) || 'supabase';
    
    // 获取任务信息
    const task = await taskService.getTask(albumId, dataSource);
    
    if (!task) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    // 获取图片列表
    const images = await taskService.getImagesByTask(albumId, dataSource);
    
    res.json({
      albumId: task.id,
      name: task.album_name,
      totalFrames: task.total_frames,
      resolution: task.resolution,
      createdAt: task.created_at,
      images: images.map(img => ({
        id: img.id,
        frameNumber: img.frame_number,
        filename: img.filename,
        filePath: img.file_path,
        fileSize: img.file_size,
        createdAt: img.created_at
      }))
    });
  } catch (error) {
    console.error('Album query error:', error);
    res.status(500).json({ error: 'Failed to get album' });
  }
});

export default router;