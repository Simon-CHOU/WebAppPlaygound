# 使用Node.js 20作为基础镜像
FROM node:20-alpine

# 安装FFmpeg和Intel QSV依赖
RUN apk add --no-cache \
    ffmpeg \
    libva \
    libva-intel-driver \
    intel-media-driver \
    && rm -rf /var/cache/apk/*

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 安装pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 创建必要的目录
RUN mkdir -p uploads albums

# 暴露端口
EXPOSE 3000 3001

# 启动应用
CMD ["pnpm", "run", "dev"]