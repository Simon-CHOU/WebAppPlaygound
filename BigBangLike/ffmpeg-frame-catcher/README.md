# MP4转HEIC相册Web服务

一个现代化的Web应用，可以将MP4视频转换为HEIC格式的相册，支持硬件加速和Google Photos式的照片流展示。

## 🚀 特性

- **硬件加速**: 利用Intel Arc A380和QSV技术，处理速度提升3-8倍
- **存储优化**: HEIC格式比PNG节省70-85%存储空间
- **照片流展示**: Google Photos式的瀑布流布局和预览体验
- **拖拽上传**: 简单易用的拖拽上传界面
- **实时进度**: 上传和处理进度实时显示
- **响应式设计**: 适配桌面端、平板和移动端

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + TailwindCSS + Vite
- **后端**: Express.js + TypeScript
- **数据库**: Supabase (PostgreSQL)
- **视频处理**: FFmpeg 6.0 (支持Intel QSV硬件加速)
- **文件上传**: Multer
- **测试**: Vitest + React Testing Library

## 📋 系统要求

- Node.js 18+
- FFmpeg 6.0+ (需编译支持QSV和libheif)
- Intel Arc A380显卡 (可选，用于硬件加速)
- 8GB+ RAM
- 50GB+ 存储空间

## 🔧 安装和运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd mp4-heic-album
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 服务器配置
PORT=3001
NODE_ENV=development

# 文件上传配置
MAX_FILE_SIZE=2147483648
UPLOAD_DIR=uploads
ALBUMS_DIR=albums
```

### 4. 运行开发服务器

```bash
pnpm run dev
```

前端开发服务器: http://localhost:3000  
后端API服务器: http://localhost:3001

## 🧪 测试

### 运行所有测试

```bash
pnpm test
```

### 运行前端测试

```bash
pnpm test:client
```

### 运行后端测试

```bash
pnpm test:server
```

## 🐳 Docker部署

### 使用Docker Compose

```bash
docker-compose up -d
```

### 构建Docker镜像

```bash
docker build -t mp4-heic-album .
```

### 运行容器

```bash
docker run -p 3000:3000 -p 3001:3001 --env-file .env mp4-heic-album
```

## 📖 API文档

### 文件上传

```http
POST /api/upload
Content-Type: multipart/form-data

Body:
- file: MP4视频文件
```

响应：
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "uploaded",
  "message": "File uploaded successfully"
}
```

### 查询进度

```http
GET /api/progress/:taskId
```

响应：
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 65,
  "currentFrame": 1300,
  "totalFrames": 2000,
  "estimatedTime": 45
}
```

### 获取相册信息

```http
GET /api/album/:albumId
```

响应：
```json
{
  "albumId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "video_name",
  "totalFrames": 2000,
  "resolution": "1920x1080",
  "createdAt": "2024-01-01T00:00:00Z",
  "images": [
    {
      "id": "...",
      "frameNumber": 1,
      "filename": "video_name_0001.heic",
      "filePath": "/albums/.../video_name_0001.heic",
      "fileSize": 102400,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 🎯 使用流程

1. **上传视频**: 拖拽或点击上传MP4文件
2. **等待处理**: 系统会自动提取每一帧并转换为HEIC格式
3. **查看相册**: 处理完成后自动跳转到相册页面
4. **浏览照片**: 支持瀑布流展示和单张图片预览
5. **下载相册**: 可以下载整个相册的HEIC图片

## 🔍 开发说明

### 项目结构

```
├── src/                    # 前端源代码
│   ├── components/          # React组件
│   ├── pages/              # 页面组件
│   └── App.tsx             # 主应用组件
├── api/                    # 后端API源代码
│   ├── routes/             # Express路由
│   ├── services/           # 业务逻辑服务
│   └── lib/                # 工具库
├── supabase/               # 数据库迁移文件
└── docker-compose.yml      # Docker配置
```

### 开发模式

本项目采用TDD（测试驱动开发）模式：

1. 先编写测试用例
2. 实现功能代码
3. 运行测试验证
4. 重构优化

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请在GitHub上提交Issue。