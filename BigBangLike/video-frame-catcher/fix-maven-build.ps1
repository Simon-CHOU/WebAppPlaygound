# Maven构建修复脚本

param(
    [Parameter(Mandatory=$false)]
    [switch]$CleanCache = $false
)

Write-Host "🔧 修复Maven构建问题..." -ForegroundColor Cyan

# 检查Java版本
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "Java版本: $javaVersion" -ForegroundColor Green
} catch {
    Write-Error "Java未安装或未配置到PATH"
    exit 1
}

# 检查Maven版本
try {
    $mavenVersion = mvn -version | Select-Object -First 3
    Write-Host "Maven版本信息:" -ForegroundColor Green
    $mavenVersion | Write-Host
} catch {
    Write-Error "Maven未安装或未配置到PATH"
    exit 1
}

# 进入后端目录
Set-Location backend

# 清理Maven缓存（如果请求）
if ($CleanCache) {
    Write-Host "🧹 清理Maven缓存..." -ForegroundColor Yellow
    mvn clean
    $mavenRepo = "$env:USERPROFILE\.m2\repository\org\springframework\boot"
    if (Test-Path $mavenRepo) {
        Remove-Item $mavenRepo -Recurse -Force
        Write-Host "✅ Spring Boot缓存已清理" -ForegroundColor Green
    }
}

# 配置Maven设置
Write-Host "📝 配置Maven设置..." -ForegroundColor Yellow
$mavenSettings = @"
<settings>
    <mirrors>
        <mirror>
            <id>aliyun</id>
            <mirrorOf>central</mirrorOf>
            <url>https://maven.aliyun.com/repository/central</url>
        </mirror>
    </mirrors>
</settings>
"@

$mavenSettings | Out-File -FilePath ".\settings.xml" -Encoding UTF8

# 设置Maven选项
$env:MAVEN_OPTS = "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository -Dmaven.wagon.http.retryHandler.count=3"

# 测试基础依赖解析
Write-Host "🧪 测试基础依赖解析..." -ForegroundColor Yellow
try {
    mvn help:effective-pom -q
    Write-Host "✅ Maven配置正常" -ForegroundColor Green
} catch {
    Write-Error "Maven配置有问题"
    exit 1
}

# 尝试解析Spring Boot父POM
Write-Host "📦 解析Spring Boot父POM..." -ForegroundColor Yellow
try {
    mvn dependency:resolve -q
    Write-Host "✅ Spring Boot依赖解析成功" -ForegroundColor Green
} catch {
    Write-Error "Spring Boot依赖解析失败"
    Write-Host "尝试手动安装依赖..." -ForegroundColor Yellow

    # 手动下载Spring Boot父POM
    $parentPom = "spring-boot-starter-parent-3.2.0.pom"
    $parentUrl = "https://maven.aliyun.com/repository/central/org/springframework/boot/spring-boot-starter-parent/3.2.0/spring-boot-starter-parent-3.2.0.pom"

    try {
        Invoke-WebRequest -Uri $parentUrl -OutFile $parentPem
        Write-Host "✅ 手动下载父POM成功" -ForegroundColor Green
    } catch {
        Write-Error "手动下载也失败，请检查网络连接"
        exit 1
    }
}

# 尝试编译项目
Write-Host "🔨 尝试编译项目..." -ForegroundColor Yellow
try {
    mvn compile -q
    Write-Host "✅ 编译成功" -ForegroundColor Green
} catch {
    Write-Error "编译失败"

    # 显示详细错误信息
    Write-Host "详细错误信息:" -ForegroundColor Red
    mvn compile -e

    Write-Host "`n🔧 尝试修复常见问题..." -ForegroundColor Yellow

    # 更新pom.xml中的依赖版本
    Write-Host "1. 检查Spring Boot版本兼容性" -ForegroundColor White
    Write-Host "2. 检查Java版本兼容性" -ForegroundColor White
    Write-Host "3. 检查网络连接" -ForegroundColor White
    Write-Host "4. 尝试使用离线模式: mvn compile -o" -ForegroundColor White

    exit 1
}

# 尝试打包
Write-Host "📦 尝试打包..." -ForegroundColor Yellow
try {
    mvn package -DskipTests -q
    $jarFile = Get-ChildItem "target\*.jar" | Select-Object -First 1
    if ($jarFile) {
        Write-Host "✅ 打包成功: $($jarFile.Name)" -ForegroundColor Green
        Write-Host "文件大小: $([math]::Round($jarFile.Length / 1MB, 2)) MB" -ForegroundColor Gray
    } else {
        throw "未找到生成的jar文件"
    }
} catch {
    Write-Error "打包失败"
    exit 1
}

# 清理临时文件
if (Test-Path ".\settings.xml") {
    Remove-Item ".\settings.xml"
}

Write-Host "`n🎉 Maven构建修复成功！" -ForegroundColor Green
Write-Host "现在可以继续Docker部署了。" -ForegroundColor Cyan

# 返回原目录
Set-Location ..