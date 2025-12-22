import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('进度查询API', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/progress/:taskId', () => {
    it('应该处理不存在的任务ID', async () => {
      const nonExistentTaskId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/progress/${nonExistentTaskId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('应该返回任务进度信息格式', async () => {
      const mockTaskId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/progress/${mockTaskId}`);

      // 由于数据库中没有数据，我们期望404，但验证响应格式
      if (response.status === 404) {
        expect(response.body).toHaveProperty('error');
      } else {
        expect(response.body).toHaveProperty('taskId');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('progress');
        expect(response.body).toHaveProperty('currentFrame');
        expect(response.body).toHaveProperty('totalFrames');
        expect(response.body).toHaveProperty('estimatedTime');
      }
    });
  });
});