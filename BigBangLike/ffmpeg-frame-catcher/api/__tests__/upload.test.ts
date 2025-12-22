import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('文件上传API', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0); // 使用随机端口
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/upload', () => {
    it('应该成功上传MP4文件', async () => {
      // 创建一个测试用的MP4文件（小文件）
      const testFilePath = path.join(__dirname, 'test.mp4');
      const buffer = Buffer.from('test mp4 content');
      fs.writeFileSync(testFilePath, buffer);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('status', 'uploaded');
      expect(response.body).toHaveProperty('message');

      // 清理测试文件
      fs.unlinkSync(testFilePath);
    });

    it('应该处理缺少文件的情况', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});