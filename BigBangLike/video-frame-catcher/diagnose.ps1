# Docker环境诊断脚本

Write-Host "🔍 Docker环境诊断" -ForegroundColor Cyan

Write-Host "`n1. Docker版本信息：" -ForegroundColor Yellow
docker --version
docker compose version

Write-Host "`n2. Docker服务状态：" -ForegroundColor Yellow
docker info | Select-String -Pattern "Server Version|Containers|Images"

Write-Host "`n3. 网络连接测试：" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://registry-1.docker.io/v2/" -TimeoutSec 10
    Write-Host "✅ Docker Hub连接正常" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Hub连接失败" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n4. 本地镜像列表：" -ForegroundColor Yellow
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

Write-Host "`n5. Docker配置检查：" -ForegroundColor Yellow
$configPath = "$env:USERPROFILE\.docker\daemon.json"
if (Test-Path $configPath) {
    Write-Host "✅ Docker配置文件存在: $configPath" -ForegroundColor Green
    Get-Content $configPath | Write-Host
} else {
    Write-Host "❌ Docker配置文件不存在" -ForegroundColor Red
}

Write-Host "`n6. 端口占用检查：" -ForegroundColor Yellow
$ports = @(80, 8080, 5432)
foreach ($port in $ports) {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $port)
        $connection.Close()
        Write-Host "⚠️  端口 $port 已被占用" -ForegroundColor Yellow
    } catch {
        Write-Host "✅ 端口 $port 可用" -ForegroundColor Green
    }
}

Write-Host "`n7. 系统资源检查：" -ForegroundColor Yellow
$memory = Get-WmiObject -Class Win32_ComputerSystem | Select-Object TotalPhysicalMemory
$memoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
Write-Host "系统内存: $memoryGB GB" -ForegroundColor White

$cpu = Get-WmiObject -Class Win32_Processor | Select-Object NumberOfCores
Write-Host "CPU核心数: $($cpu.NumberOfCores)" -ForegroundColor White

$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object FreeSpace
$diskGB = [math]::Round($disk.FreeSpace / 1GB, 2)
Write-Host "C盘剩余空间: $diskGB GB" -ForegroundColor White

Write-Host "`n🔧 建议修复步骤：" -ForegroundColor Cyan
Write-Host "1. 运行 .\fix-docker-registry.ps1" -ForegroundColor White
Write-Host "2. 重启Docker Desktop" -ForegroundColor White
Write-Host "3. 检查防火墙设置" -ForegroundColor White
Write-Host "4. 如果问题持续，尝试 .\deploy-alternative.ps1" -ForegroundColor White