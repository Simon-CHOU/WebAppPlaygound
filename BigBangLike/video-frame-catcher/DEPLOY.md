# Video Frame Catcher 部署指南

## 环境要求

### 基础环境
- **操作系统**: Windows 11 25H2
- **CPU**: 12核心
- **内存**: 64GB RAM
- **GPU**: Intel Arc A380 6GB
- **Docker Desktop**: 最新版本

### 依赖软件
- Docker Desktop 4.0+
- Windows PowerShell 5.1+ 或 PowerShell 7+
- Git (可选，用于版本控制)

## 快速部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd video-frame-catcher
```

### 2. 使用PowerShell部署 (推荐)

```powershell
# 完整部署（构建镜像+启动服务）
.\deploy.ps1 -Action deploy

# 或者仅启动已有服务
.\deploy.ps1 -Action start
```

### 3. 使用Bash部署 (适用于WSL)

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 完整部署
./deploy.sh deploy

# 或者仅启动服务
./deploy.sh start
```

## 服务访问

部署完成后，可以通过以下地址访问服务：

- **前端应用**: http://localhost
- **后端API**: http://localhost/api
- **API文档**: http://localhost:8080/swagger-ui.html
- **健康检查**: http://localhost:8080/api/actuator/health

## 常用操作

### 服务管理
```powershell
# 查看服务状态
.\deploy.ps1 -Action status

# 重启服务
.\deploy.ps1 -Action restart

# 停止服务
.\deploy.ps1 -Action stop

# 查看实时日志
.\deploy.ps1 -Action logs

# 完全清理（包括数据）
.\deploy.ps1 -Action cleanup
```

### Docker Compose命令
```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启特定服务
docker compose restart backend

# 进入容器
docker compose exec backend sh
```

## 配置说明

### 环境变量配置

主要配置在 `docker-compose.yml` 文件中：

#### 数据库配置
```yaml
environment:
  POSTGRES_DB: video_frame_catcher
  POSTGRES_USER: vfc_user
  POSTGRES_PASSWORD: vfc_password
```

#### 后端配置
```yaml
environment:
  # GPU加速配置
  GPU_ENABLED: "true"
  INTEL_OPENVINO_ENABLED: "true"
  NVIDIA_CUDA_ENABLED: "true"
  AMD_VULKAN_ENABLED: "true"

  # 图像处理配置
  HEIC_QUALITY: "80"
  THUMBNAIL_WIDTH: "200"
  THUMBNAIL_HEIGHT: "200"
```

#### 前端配置
```yaml
environment:
  VITE_API_BASE_URL: http://localhost/api
  VITE_MAX_FILE_SIZE: "2048"
  VITE_ENABLE_GPU_ACCELERATION: "true"
```

### 存储配置

数据存储在Docker卷中：
- `postgres_data`: PostgreSQL数据
- `storage_data`: 视频和帧图像文件
- `temp_data`: 临时处理文件

本地存储映射：
- `./storage`: 应用存储目录
- `./temp`: 临时文件目录
- `./logs`: 应用日志目录

## GPU支持

### Intel Arc A380支持
系统自动检测并使用Intel Arc GPU进行视频处理加速。

### NVIDIA CUDA支持
如果系统有NVIDIA GPU，会自动使用CUDA加速。

### AMD Vulkan支持
如果系统有AMD GPU，会自动使用Vulkan加速。

### GPU使用监控
通过后端API可以监控GPU使用情况：
```bash
curl http://localhost:8080/api/actuator/metrics
```

## 性能优化

### 系统级优化
1. **Docker Desktop设置**:
   - 分配足够的内存（推荐8GB+）
   - 分配足够的CPU核心（推荐8核心+）
   - 启用GPU支持

2. **Windows性能设置**:
   - 设置电源计划为"高性能"
   - 禁用不必要的启动程序

### 应用级优化
1. **并行处理配置**:
   ```yaml
   MAX_PARALLEL_THREADS: "4"        # FFmpeg并行线程数
   IMAGE_PROCESSING_THREADS: "4"    # 图像处理线程数
   ```

2. **内存配置**:
   ```yaml
   JAVA_OPTS: "-Xmx2g -Xms1g"       # JVM内存设置
   ```

## 故障排除

### 常见问题

#### 1. 端口冲突
如果遇到端口占用问题：
```powershell
# 查看端口占用
netstat -ano | findstr ":8080"

# 停止占用端口的服务
taskkill /PID <进程ID> /F
```

#### 2. Docker问题
```powershell
# 重启Docker服务
Restart-Service docker

# 清理Docker缓存
docker system prune -a
```

#### 3. 内存不足
如果遇到内存不足：
- 增加Docker Desktop内存分配
- 减少并行处理线程数
- 清理临时文件

#### 4. GPU加速问题
```powershell
# 检查GPU状态
docker compose exec backend curl -s http://localhost:8080/api/gpu/status

# 查看GPU日志
docker compose logs backend | grep -i gpu
```

### 日志查看

#### 应用日志
```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# 实时查看日志
docker compose logs -f backend
```

#### 系统日志
- 应用日志: `./logs/`
- Docker日志: Docker Desktop界面

## 备份和恢复

### 数据备份
```bash
# 备份PostgreSQL数据
docker compose exec postgres pg_dump -U vfc_user video_frame_catcher > backup.sql

# 备份存储文件
tar -czf storage_backup.tar.gz storage/
```

### 数据恢复
```bash
# 恢复PostgreSQL数据
docker compose exec -T postgres psql -U vfc_user video_frame_catcher < backup.sql

# 恢复存储文件
tar -xzf storage_backup.tar.gz
```

## 监控和维护

### 健康检查
```bash
# 检查所有服务状态
.\deploy.ps1 -Action status

# 检查API健康状态
curl http://localhost:8080/api/actuator/health

# 检查前端健康状态
curl http://localhost/health
```

### 性能监控
- 应用指标: http://localhost:8080/api/actuator/metrics
- Prometheus格式: http://localhost:8080/api/actuator/prometheus

### 定期维护
1. 清理临时文件
2. 检查存储空间
3. 更新Docker镜像
4. 备份重要数据

## 安全配置

### 生产环境建议
1. **更改默认密码**
2. **启用HTTPS**
3. **配置防火墙**
4. **定期更新镜像**
5. **启用访问日志**

### 密码更新
在`docker-compose.yml`中更新：
```yaml
POSTGRES_PASSWORD: your_secure_password
ADMIN_PASSWORD: your_admin_password
```

## 支持和帮助

如果遇到问题：

1. 查看日志文件确定错误原因
2. 检查系统资源使用情况
3. 参考故障排除部分
4. 提交Issue到项目仓库

---

**注意**: 首次部署可能需要较长时间来下载和构建Docker镜像。