import express from 'express';
import { taskService } from '../services/taskService';
import { DataSource } from '../lib/db/DbFactory';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';

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
      fps: 30, // 默认 30fps，实际可以从 ffprobe 获取并存入 tasks 表
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

// 下载相册 ZIP
router.get('/album/:albumId/zip', async (req, res) => {
  try {
    const { albumId } = req.params;
    const dataSource = (req.query.dataSource as DataSource) || 'supabase';
    
    const task = await taskService.getTask(albumId, dataSource);
    if (!task) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const images = await taskService.getImagesByTask(albumId, dataSource);
    const albumsDir = process.env.ALBUMS_DIR || 'albums';

    res.attachment(`${task.album_name || 'album'}.zip`);
    
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (const image of images) {
      const fullPath = path.resolve(albumsDir, image.file_path);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: image.filename });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('ZIP generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate ZIP' });
    }
  }
});

export default router;