import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { taskService } from '../services/taskService';
import { ffmpegService } from '../services/ffmpegService';

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // 只接受MP4文件
    if (file.mimetype === 'video/mp4' || path.extname(file.originalname).toLowerCase() === '.mp4') {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 files are allowed'));
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '2147483648') // 默认2GB
  }
});

import { DataSource } from '../lib/db/DbFactory';

// 文件上传接口
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dataSource = (req.body.dataSource as DataSource) || 'supabase';

    // 解决中文文件名乱码问题
    const originalFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    // 使用 uuid 作为目录名，文件名使用 safe 的前缀，避免文件系统编码问题
    const albumName = path.basename(originalFilename, path.extname(originalFilename));
    
    // 创建任务记录
    const task = await taskService.createTask(originalFilename, albumName, dataSource);
    
    // 异步处理视频文件
    // 传递 "frame" 作为文件名前缀，而不是可能包含特殊字符的 albumName
    processVideo(task.id, req.file.path, albumName, dataSource).catch(error => {
      console.error('Video processing failed:', error);
    });

    res.json({
      taskId: task.id,
      status: 'uploaded',
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// 异步处理视频
async function processVideo(taskId: string, inputPath: string, originalAlbumName: string, dataSource: DataSource) {
  try {
    // 更新任务状态为处理中
    await taskService.updateTaskStatus(taskId, 'processing', undefined, dataSource);
    
    // 获取视频信息
    const videoInfo = await ffmpegService.getVideoInfo(inputPath);
    
    // 更新总帧数
    await taskService.updateTaskStatus(taskId, 'processing', videoInfo.totalFrames, dataSource);
    
    // 创建相册目录
    const albumsDir = process.env.ALBUMS_DIR || 'albums';
    // 尝试使用 sanitize 后的文件名作为目录名
    const sanitizedAlbumName = originalAlbumName.replace(/[\\/:*?"<>|]/g, '_');
    // 为了防止重名，加上 taskId 的前8位
    const albumDirName = `${sanitizedAlbumName}_${taskId.substring(0, 8)}`;
    const albumDir = path.join(albumsDir, albumDirName);
    
    await fs.mkdir(albumDir, { recursive: true });
    
    // 处理进度回调
    let processedFrames = 0;
    let lastUpdateTime = 0;
    let lastProgress = -1;

    const onProgress = (currentFrame: number, totalFrames: number) => {
      if (!totalFrames || totalFrames <= 0) return;
      
      processedFrames = currentFrame;
      const progress = Math.min(100, Math.round((currentFrame / totalFrames) * 100));
      
      const now = Date.now();
      // 节流：每 500ms 或进度为 100% 时更新
      if (progress === 100 || (now - lastUpdateTime > 500)) {
        // 只有进度增加时才更新
        if (progress > lastProgress) {
          lastUpdateTime = now;
          lastProgress = progress;
          // 更新任务进度，不等待异步结果以提高性能
          taskService.updateTaskProgress(taskId, progress, 'processing', dataSource).catch(err => {
            console.error(`Failed to update task ${taskId} progress to ${progress}%:`, err);
          });
        }
      }
    };
    
    // 处理视频到HEIC
    const heicFiles = await ffmpegService.processVideoToHEIC(
      inputPath,
      albumDir,
      "frame", // 这里的 frame 是文件名前缀
      onProgress
    );
    
    // 保存图片记录到数据库
    for (let i = 0; i < heicFiles.length; i++) {
      const filePath = heicFiles[i];
      // 存储相对路径，方便前端访问
      const relativePath = path.relative(albumsDir, filePath);
      const frameNumber = i + 1;
      const filename = path.basename(filePath);
      
      const stats = await fs.stat(filePath);
      
      await taskService.createImage(
        taskId,
        frameNumber,
        filename,
        relativePath, // 存相对路径
        stats.size,
        dataSource
      );
    }
    
    // 更新任务状态为完成
    await taskService.updateTaskStatus(taskId, 'completed', undefined, dataSource);
    
    // 删除原始上传文件
    await fs.unlink(inputPath);
    
  } catch (error) {
    console.error('Video processing error:', error);
    await taskService.updateTaskStatus(taskId, 'failed', undefined, dataSource);
  }
}

export default router;