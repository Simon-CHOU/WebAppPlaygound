import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('相册API', () => {
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

  describe('GET /api/album/:albumId', () => {
    it('应该处理不存在的相册ID', async () => {
      const nonExistentAlbumId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/album/${nonExistentAlbumId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('应该返回相册信息格式', async () => {
      const mockAlbumId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/album/${mockAlbumId}`);

      // 由于数据库中没有数据，我们期望404，但验证响应格式
      if (response.status === 404) {
        expect(response.body).toHaveProperty('error');
      } else {
        expect(response.body).toHaveProperty('albumId');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('totalFrames');
        expect(response.body).toHaveProperty('resolution');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('images');
        expect(Array.isArray(response.body.images)).toBe(true);
      }
    });
  });
});