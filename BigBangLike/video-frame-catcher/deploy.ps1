# Video Frame Catcher Docker部署脚本 (PowerShell版本)
# 适用于Windows PowerShell + Docker Desktop环境

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "start", "stop", "restart", "logs", "cleanup", "status")]
    [string]$Action = "deploy"
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" -Color Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" -Color Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" -Color Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" -Color Red
}

# 检查Docker环境
function Test-DockerEnvironment {
    Write-Info "检查Docker环境..."

    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = docker --version
        $null = docker compose version
        Write-Success "Docker环境检查通过"
        return $true
    }
    catch {
        Write-Error "Docker未安装或未运行"
        return $false
    }
}

# 检查端口占用
function Test-PortUsage {
    Write-Info "检查端口占用..."

    # 检查常用端口
    $ports = @(5432, 8080, 80)
    foreach ($port in $ports) {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.Connect("localhost", $port)
            $connection.Close()
            Write-Warning "端口 $port 已被占用"
        }
        catch {
            # 端口未被占用
        }
    }
}

# 创建必要的目录
function New-RequiredDirectories {
    Write-Info "创建必要的目录..."

    $directories = @("storage", "logs", "temp", "postgres_data")
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    Write-Success "目录创建完成"
}

# 构建镜像
function Build-DockerImages {
    Write-Info "构建Docker镜像..."

    try {
        Write-Info "构建后端镜像..."
        docker compose build backend

        if ($LASTEXITCODE -ne 0) {
            throw "后端镜像构建失败"
        }

        Write-Info "构建前端镜像..."
        docker compose build frontend

        if ($LASTEXITCODE -ne 0) {
            throw "前端镜像构建失败"
        }

        Write-Success "镜像构建完成"
    }
    catch {
        Write-Error "镜像构建失败: $($_.Exception.Message)"
        throw
    }
}

# 启动服务
function Start-Services {
    Write-Info "启动服务..."

    try {
        # 首先启动数据库
        Write-Info "启动PostgreSQL数据库..."
        docker compose up -d postgres

        if ($LASTEXITCODE -ne 0) {
            throw "PostgreSQL启动失败"
        }

        # 等待数据库启动
        Write-Info "等待数据库启动..."
        Start-Sleep -Seconds 15

        # 检查数据库健康状态
        $maxAttempts = 30
        $attempt = 0
        do {
            $attempt++
            $healthy = docker compose ps postgres | Select-String "healthy"
            if ($healthy) {
                Write-Success "数据库启动完成"
                break
            }
            Write-Info "等待数据库启动... ($attempt/$maxAttempts)"
            Start-Sleep -Seconds 2
        } while ($attempt -lt $maxAttempts)

        if (!$healthy) {
            throw "数据库启动超时"
        }

        # 启动后端服务
        Write-Info "启动后端服务..."
        docker compose up -d backend

        if ($LASTEXITCODE -ne 0) {
            throw "后端服务启动失败"
        }

        # 等待后端启动
        Write-Info "等待后端服务启动..."
        Start-Sleep -Seconds 30

        # 检查后端健康状态
        $maxAttempts = 30
        $attempt = 0
        do {
            $attempt++
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/api/actuator/health" -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Success "后端服务启动完成"
                    break
                }
            }
            catch {
                # 继续等待
            }
            Write-Info "等待后端服务启动... ($attempt/$maxAttempts)"
            Start-Sleep -Seconds 2
        } while ($attempt -lt $maxAttempts)

        # 启动前端服务
        Write-Info "启动前端服务..."
        docker compose up -d frontend

        if ($LASTEXITCODE -ne 0) {
            throw "前端服务启动失败"
        }

        Write-Success "所有服务启动完成"
    }
    catch {
        Write-Error "服务启动失败: $($_.Exception.Message)"
        throw
    }
}

# 检查服务状态
function Test-Services {
    Write-Info "检查服务状态..."

    $services = @(
        @{ Name = "PostgreSQL"; Service = "postgres" },
        @{ Name = "后端服务"; Service = "backend" },
        @{ Name = "前端服务"; Service = "frontend" }
    )

    foreach ($svc in $services) {
        $status = docker compose ps $svc.Service | Select-String "Up"
        if ($status) {
            Write-Success "$($svc.Name) 运行正常"
        } else {
            Write-Error "$($svc.Name) 运行异常"
        }
    }
}

# 显示访问信息
function Show-AccessInfo {
    Write-Info "服务访问信息:"
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "前端应用: http://localhost" -ForegroundColor Green
    Write-Host "后端API: http://localhost/api" -ForegroundColor Green
    Write-Host "API文档: http://localhost:8080/swagger-ui.html" -ForegroundColor Green
    Write-Host "健康检查: http://localhost:8080/api/actuator/health" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Cyan
}

# 清理函数
function Invoke-Cleanup {
    Write-Warning "清理服务..."
    docker compose down -v
    Write-Success "清理完成"
}

# 显示日志
function Show-Logs {
    Write-Info "显示服务日志..."
    docker compose logs -f
}

# 主函数
function Main {
    Write-Info "开始部署Video Frame Catcher..."

    if (!(Test-DockerEnvironment)) {
        exit 1
    }

    Test-PortUsage
    New-RequiredDirectories

    switch ($Action) {
        "deploy" {
            Build-DockerImages
            Start-Services
            Test-Services
            Show-AccessInfo
        }
        "start" {
            Start-Services
            Test-Services
            Show-AccessInfo
        }
        "stop" {
            Write-Info "停止服务..."
            docker compose down
            Write-Success "服务已停止"
        }
        "restart" {
            Write-Info "重启服务..."
            docker compose restart
            Test-Services
            Show-AccessInfo
        }
        "logs" {
            Show-Logs
        }
        "cleanup" {
            Invoke-Cleanup
        }
        "status" {
            Test-Services
        }
        default {
            Write-Error "未知操作: $Action"
            Write-Host "用法: ./deploy.ps1 -Action {deploy|start|stop|restart|logs|cleanup|status}" -ForegroundColor Yellow
            Write-Host "" -ForegroundColor Yellow
            Write-Host "命令说明:" -ForegroundColor Yellow
            Write-Host "  deploy  - 完整部署（构建镜像+启动服务）" -ForegroundColor White
            Write-Host "  start   - 启动服务" -ForegroundColor White
            Write-Host "  stop    - 停止服务" -ForegroundColor White
            Write-Host "  restart - 重启服务" -ForegroundColor White
            Write-Host "  logs    - 显示日志" -ForegroundColor White
            Write-Host "  cleanup - 清理所有服务和数据" -ForegroundColor White
            Write-Host "  status  - 检查服务状态" -ForegroundColor White
            exit 1
        }
    }
}

# 捕获错误
try {
    Main
}
catch {
    Write-Error "部署失败: $($_.Exception.Message)"
    exit 1
}