# Video Frame Catcher

一个基于Web的视频转帧图像收藏应用，支持将视频转换为帧图像，并提供Google Photos风格的浏览界面。

## 功能特性

- 🎥 **视频上传**: 支持拖拽上传MP4视频文件
- 🖼️ **帧提取**: 自动提取视频帧并保存为HEIC格式
- 🎨 **浏览界面**: Google Photos风格的相册浏览体验
- ⚡ **GPU加速**: 支持Intel Arc、NVIDIA CUDA、AMD Vulkan等GPU加速
- 💾 **高效存储**: HEIC格式节省50-70%存储空间
- 🏗️ **可扩展架构**: 支持未来对接对象存储
- 🐳 **容器化部署**: Docker Compose一键部署

## 技术栈

### 后端
- **运行时**: Java 21 + GraalVM
- **框架**: Spring Boot 4
- **数据库**: PostgreSQL 16+
- **图像处理**: FFmpeg + OpenCV
- **构建工具**: Maven

### 前端
- **框架**: React 18 + TypeScript
- **UI组件**: Ant Design
- **状态管理**: Zustand
- **构建工具**: Vite

### 基础设施
- **反向代理**: Nginx
- **容器化**: Docker + Docker Compose
- **数据库**: PostgreSQL

## 快速开始

### 环境要求

- Docker Desktop 4.0+
- Node.js 18+ (开发环境)
- Java 21+ (开发环境)
- FFmpeg (系统安装)

### 使用Docker Compose部署

1. 克隆项目
```bash
git clone <repository-url>
cd video-frame-catcher
```

2. 启动所有服务
```bash
docker-compose up -d
```

3. 访问应用
- 前端: http://localhost:3000
- 后端API: http://localhost:8080/api
- API文档: http://localhost:8080/swagger-ui.html

### 开发环境搭建

#### 后端设置

```bash
cd backend
# 安装依赖
mvn clean install

# 启动应用
mvn spring-boot:run
```

#### 前端设置

```bash
cd frontend
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 项目结构

```
video-frame-catcher/
├── backend/                 # Spring Boot后端
│   ├── src/main/java/      # Java源代码
│   ├── src/main/resources/ # 配置文件
│   └── src/test/           # 测试代码
├── frontend/               # React前端
│   ├── src/               # React源代码
│   ├── public/            # 静态资源
│   └── dist/              # 构建输出
├── docker/                # Docker配置
├── docs/                  # 项目文档
└── docker-compose.yml     # Docker编排配置
```

## API文档

启动后端服务后，可以通过以下URL访问API文档：
- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/api-docs

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DB_USERNAME | vfc_user | 数据库用户名 |
| DB_PASSWORD | vfc_password | 数据库密码 |
| GPU_ENABLED | true | 是否启用GPU加速 |
| FFMPEG_PATH | ffmpeg | FFmpeg可执行文件路径 |
| STORAGE_BASE_PATH | ./storage | 存储基础路径 |

### GPU加速支持

- **Intel Arc**: OpenVINO
- **NVIDIA**: CUDA
- **AMD**: Vulkan
- **通用**: CPU降级支持

## 开发指南

### TDD开发流程

1. 每个功能先编写测试
2. 实现功能代码
3. 验证测试通过
4. 重构代码
5. 提交代码

### 代码规范

- 后端遵循Google Java Style Guide
- 前端遵循ESLint + Prettier规则
- 提交信息遵循Conventional Commits

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目链接: [https://github.com/your-username/video-frame-catcher](https://github.com/your-username/video-frame-catcher)