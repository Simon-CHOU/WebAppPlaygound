import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = express.Router();

// 获取默认下载目录
router.get('/download/default-path', (req, res) => {
  const homeDir = os.homedir();
  const defaultPath = path.join(homeDir, 'Downloads', 'frame-catcher-output');
  res.json({ defaultPath });
});

// 保存文件到本地目录
router.post('/download/local', async (req, res) => {
  try {
    const { files, targetDir } = req.body;

    if (!files || !Array.isArray(files) || !targetDir) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const albumsDir = process.env.ALBUMS_DIR || 'albums';
    const results = [];

    for (const file of files) {
      const sourcePath = path.resolve(albumsDir, file.path);
      const destPath = path.join(targetDir, file.name);

      try {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          results.push({ name: file.name, status: 'success' });
        } else {
          results.push({ name: file.name, status: 'failed', error: 'Source file not found' });
        }
      } catch (err: any) {
        results.push({ name: file.name, status: 'failed', error: err.message });
      }
    }

    res.json({ results });
  } catch (error: any) {
    console.error('Local save error:', error);
    res.status(500).json({ error: 'Failed to save files locally: ' + error.message });
  }
});

export default router;
