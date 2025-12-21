# 使用官方的OpenJDK 21运行时作为父镜像
FROM openjdk:21-jdk-slim

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ffprobe \
    python3 \
    python3-pip \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 安装OpenVINO (Intel GPU支持)
RUN pip3 install openvino-dev

# 复制Maven配置文件
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# 下载Maven依赖
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B

# 复制源代码
COPY src ./src

# 构建应用
RUN ./mvnw clean package -DskipTests

# 创建应用用户
RUN groupadd -r vfc && useradd -r -g vfc vfc

# 创建存储目录
RUN mkdir -p /app/storage/albums && \
    mkdir -p /app/temp && \
    chown -R vfc:vfc /app/storage && \
    chown -R vfc:vfc /app/temp

# 切换到非root用户
USER vfc

# 暴露端口
EXPOSE 8080

# 设置JVM参数
ENV JAVA_OPTS="-Xmx2g -Xms1g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# 启动应用
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar target/video-frame-catcher-backend-*.jar"]