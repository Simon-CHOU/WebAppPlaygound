# Video Frame Catcher 快速开始指南

## 🚀 5分钟快速部署

### 前置要求
- Windows 11 25H2
- Docker Desktop (最新版本)
- PowerShell (推荐) 或 WSL

### 一键部署
```powershell
# 克隆项目
git clone <repository-url>
cd video-frame-catcher

# 一键部署 (Windows PowerShell)
.\deploy.ps1

# 或者在 WSL/Linux 中
./deploy.sh
```

部署完成后，访问 http://localhost 即可使用！

## 📱 使用指南

### 1. 上传视频
1. 打开浏览器访问 http://localhost
2. 点击"上传视频"按钮
3. 拖拽MP4文件到上传区域
4. 输入相册名称
5. 点击"上传"

### 2. 查看处理进度
- 上传后系统会自动处理视频
- 相册状态显示"处理中"
- 处理完成后状态变为"已完成"

### 3. 浏览帧图像
1. 点击相册进入浏览页面
2. 查看网格状布局的所有帧
3. 点击图片可放大查看
4. 支持批量收藏操作

### 4. 收藏管理
- 点击爱心图标收藏图片
- 使用批量操作收藏多张图片
- 在相册中查看收藏的帧

## 🔧 常用操作

### 服务管理
```powershell
# 查看服务状态
.\deploy.ps1 -Action status

# 重启服务
.\deploy.ps1 -Action restart

# 查看日志
.\deploy.ps1 -Action logs

# 停止服务
.\deploy.ps1 -Action stop
```

### 数据管理
```bash
# 查看存储空间
docker compose exec backend du -sh /app/storage

# 备份数据库
docker compose exec postgres pg_dump -U vfc_user video_frame_catcher > backup.sql

# 清理临时文件
docker compose exec backend rm -rf /app/temp/*
```

## 📊 功能特性

### ✅ 已实现功能
- [x] 视频上传和格式验证
- [x] FFmpeg视频处理
- [x] GPU加速 (Intel Arc/NVIDIA/AMD)
- [x] HEIC格式转换
- [x] Google Photos风格界面
- [x] 批量收藏管理
- [x] 响应式设计
- [x] Docker一键部署

### 🎯 核心优势
- **高性能**: GPU加速，2-3帧/秒处理速度
- **省空间**: HEIC格式节省50-70%存储空间
- **易使用**: 直观的拖拽上传体验
- **强扩展**: 微服务架构，支持水平扩展
- **易部署**: Docker容器化，一键部署

## 🛠️ 配置说明

### 环境变量配置
主要配置文件：`docker-compose.yml`

```yaml
# GPU配置
GPU_ENABLED: "true"
INTEL_OPENVINO_ENABLED: "true"
NVIDIA_CUDA_ENABLED: "true"

# 处理配置
FRAME_EXTRACTION_FPS: "1.0"
HEIC_QUALITY: "80"
THUMBNAIL_WIDTH: "200"

# 文件大小限制
MAX_FILE_SIZE: "2GB"
```

### 性能优化
根据硬件配置调整：

```yaml
# 高性能配置
MAX_PARALLEL_THREADS: "8"
IMAGE_PROCESSING_THREADS: "8"
JAVA_OPTS: "-Xmx4g -Xms2g"

# 低配置配置
MAX_PARALLEL_THREADS: "2"
IMAGE_PROCESSING_THREADS: "2"
JAVA_OPTS: "-Xmx1g -Xms512m"
```

## 🔍 故障排除

### 常见问题

#### 1. 端口占用
```powershell
# 检查端口占用
netstat -ano | findstr ":80"

# 停止占用进程
taskkill /PID <进程ID> /F
```

#### 2. 内存不足
```powershell
# 增加Docker内存
# Docker Desktop -> Settings -> Resources -> Memory
# 建议设置为 8GB+
```

#### 3. GPU加速问题
```powershell
# 检查GPU状态
docker compose logs backend | grep -i gpu

# 禁用GPU加速（如遇问题）
# 在 docker-compose.yml 中设置 GPU_ENABLED: "false"
```

#### 4. 处理失败
```powershell
# 查看处理日志
docker compose logs backend

# 重试处理
# 在前端界面点击"重试"按钮
```

### 日志位置
- 应用日志: `./logs/`
- Docker日志: Docker Desktop界面
- 数据库日志: `docker compose logs postgres`

## 📈 性能建议

### 硬件建议
- **CPU**: 8核心以上
- **内存**: 16GB以上
- **GPU**: Intel Arc A380 或更好
- **存储**: SSD，至少100GB可用空间

### 优化配置
1. **启用GPU加速**: 自动检测可用GPU
2. **调整并行度**: 根据CPU核心数设置
3. **内存分配**: Docker分配足够内存
4. **存储优化**: 使用SSD存储

## 🔗 API文档

### 主要接口
- **GET** `/api/albums` - 获取相册列表
- **POST** `/api/albums` - 创建新相册
- **GET** `/api/albums/{id}` - 获取相册详情
- **GET** `/api/frames/album/{id}` - 获取帧列表
- **GET** `/api/actuator/health` - 健康检查

### 完整文档
访问 http://localhost:8080/swagger-ui.html 查看完整API文档

## 🤝 技术支持

### 获取帮助
1. 查看文档: `DEPLOY.md`, `VERIFICATION_REPORT.md`
2. 运行测试: `.\e2e-test.ps1`
3. 查看日志: `.\deploy.ps1 -Action logs`
4. 提交Issue: 项目GitHub页面

### 开发者信息
- **技术栈**: Java 21 + React 18 + PostgreSQL
- **架构**: 微服务 + Docker
- **GPU支持**: Intel Arc + NVIDIA CUDA + AMD Vulkan
- **测试**: TDD + E2E自动化测试

---

**🎉 开始使用Video Frame Catcher，享受视频转帧的乐趣！**

如有问题，请参考完整文档或提交Issue。