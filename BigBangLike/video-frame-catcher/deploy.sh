#!/bin/bash

# Video Frame Catcher Docker部署脚本
# 适用于Windows PowerShell + Docker Desktop环境

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker是否运行
check_docker() {
    log_info "检查Docker环境..."

    if ! docker --version > /dev/null 2>&1; then
        log_error "Docker未安装或未运行"
        exit 1
    fi

    if ! docker compose version > /dev/null 2>&1; then
        log_error "Docker Compose未安装"
        exit 1
    fi

    log_success "Docker环境检查通过"
}

# 检查端口占用
check_ports() {
    log_info "检查端口占用..."

    # 检查PostgreSQL端口
    if netstat -tuln 2>/dev/null | grep -q ":5432 "; then
        log_warning "端口5432已被占用，请检查PostgreSQL服务"
    fi

    # 检查后端端口
    if netstat -tuln 2>/dev/null | grep -q ":8080 "; then
        log_warning "端口8080已被占用，请检查后端服务"
    fi

    # 检查前端端口
    if netstat -tuln 2>/dev/null | grep -q ":80 "; then
        log_warning "端口80已被占用，请检查Web服务"
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."

    mkdir -p storage
    mkdir -p logs
    mkdir -p temp
    mkdir -p postgres_data

    log_success "目录创建完成"
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."

    # 构建后端镜像
    log_info "构建后端镜像..."
    docker compose build backend

    # 构建前端镜像
    log_info "构建前端镜像..."
    docker compose build frontend

    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."

    # 首先启动数据库
    log_info "启动PostgreSQL数据库..."
    docker compose up -d postgres

    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 10

    # 启动后端服务
    log_info "启动后端服务..."
    docker compose up -d backend

    # 等待后端启动
    log_info "等待后端服务启动..."
    sleep 30

    # 启动前端服务
    log_info "启动前端服务..."
    docker compose up -d frontend

    log_success "所有服务启动完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    # 检查PostgreSQL
    if docker compose ps postgres | grep -q "Up"; then
        log_success "PostgreSQL运行正常"
    else
        log_error "PostgreSQL启动失败"
    fi

    # 检查后端
    if docker compose ps backend | grep -q "Up"; then
        log_success "后端服务运行正常"
    else
        log_error "后端服务启动失败"
    fi

    # 检查前端
    if docker compose ps frontend | grep -q "Up"; then
        log_success "前端服务运行正常"
    else
        log_error "前端服务启动失败"
    fi
}

# 显示访问信息
show_access_info() {
    log_info "服务访问信息:"
    echo "=================================="
    echo "前端应用: http://localhost"
    echo "后端API: http://localhost/api"
    echo "API文档: http://localhost:8080/swagger-ui.html"
    echo "健康检查: http://localhost:8080/api/actuator/health"
    echo "=================================="
}

# 清理函数
cleanup() {
    log_warning "清理服务..."
    docker compose down -v
    log_success "清理完成"
}

# 显示日志
show_logs() {
    log_info "显示服务日志..."
    docker compose logs -f
}

# 主函数
main() {
    log_info "开始部署Video Frame Catcher..."

    check_docker
    check_ports
    create_directories

    # 解析命令行参数
    case "${1:-deploy}" in
        "deploy")
            build_images
            start_services
            check_services
            show_access_info
            ;;
        "start")
            start_services
            check_services
            show_access_info
            ;;
        "stop")
            log_info "停止服务..."
            docker compose down
            log_success "服务已停止"
            ;;
        "restart")
            log_info "重启服务..."
            docker compose restart
            check_services
            show_access_info
            ;;
        "logs")
            show_logs
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            check_services
            ;;
        *)
            echo "用法: $0 {deploy|start|stop|restart|logs|cleanup|status}"
            echo ""
            echo "命令说明:"
            echo "  deploy  - 完整部署（构建镜像+启动服务）"
            echo "  start   - 启动服务"
            echo "  stop    - 停止服务"
            echo "  restart - 重启服务"
            echo "  logs    - 显示日志"
            echo "  cleanup - 清理所有服务和数据"
            echo "  status  - 检查服务状态"
            exit 1
            ;;
    esac
}

# 捕获中断信号
trap 'log_warning "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"