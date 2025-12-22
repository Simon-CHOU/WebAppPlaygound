import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import uploadRoutes from './routes/upload';
import progressRoutes from './routes/progress';
import albumRoutes from './routes/album';

dotenv.config();

export function createApp() {
  const app = express();
  
  // 中间件
  app.use(cors());
  app.use(express.json());
  
  // 静态文件服务
  const albumsDir = process.env.ALBUMS_DIR || 'albums';
  app.use('/albums', express.static(albumsDir));
  
  // API路由
  app.use('/api', uploadRoutes);
  app.use('/api', progressRoutes);
  app.use('/api', albumRoutes);
  
  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // 错误处理中间件
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
      }
    }
    
    res.status(500).json({ 
      error: err.message || 'Internal server error'
    });
  });
  
  return app;
}

// 导入multer类型
import multer from 'multer';

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  const port = process.env.PORT || 3001;
  
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}