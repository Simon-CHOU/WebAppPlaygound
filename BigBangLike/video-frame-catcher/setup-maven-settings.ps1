# Maven设置配置脚本 - 解决Maven依赖下载问题

Write-Host "🔧 配置Maven全局设置..." -ForegroundColor Cyan

# 获取Maven用户目录
$mavenHome = $env:USERPROFILE
if ($env:M2_HOME) {
    $mavenHome = $env:M2_HOME
}

$mavenSettingsPath = "$mavenHome\.m2\settings.xml"

Write-Host "Maven设置路径: $mavenSettingsPath" -ForegroundColor Yellow

# 创建.m2目录（如果不存在）
$m2Dir = Split-Path $mavenSettingsPath -Parent
if (!(Test-Path $m2Dir)) {
    New-Item -ItemType Directory -Path $m2Dir -Force | Out-Null
}

# Maven settings.xml内容
$settingsXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
          http://maven.apache.org/xsd/settings-1.0.0.xsd">

    <!-- 本地仓库位置 -->
    <localRepository>`$($mavenHome)\.m2\repository</localRepository>

    <!-- 镜像配置 -->
    <mirrors>
        <!-- 阿里云中央仓库 -->
        <mirror>
            <id>aliyun-central</id>
            <mirrorOf>central</mirrorOf>
            <name>Aliyun Central</name>
            <url>https://maven.aliyun.com/repository/central</url>
        </mirror>

        <!-- 阿里云公共仓库 -->
        <mirror>
            <id>aliyun-public</id>
            <mirrorOf>*</mirrorOf>
            <name>Aliyun Public</name>
            <url>https://maven.aliyun.com/repository/public</url>
        </mirror>

        <!-- 华为云镜像（备用） -->
        <mirror>
            <id>huaweicloud</id>
            <mirrorOf>central</mirrorOf>
            <name>Huawei Cloud Central</name>
            <url>https://repo.huaweicloud.com/repository/maven/</url>
        </mirror>

        <!-- 腾讯云镜像（备用） -->
        <mirror>
            <id>nexus-tencentyun</id>
            <mirrorOf>central</mirrorOf>
            <name>Nexus tencentyun</name>
            <url>https://mirrors.cloud.tencent.com/nexus/repository/maven-public/</url>
        </mirror>
    </mirrors>

    <!-- 仓库配置 -->
    <profiles>
        <profile>
            <id>aliyun</id>
            <repositories>
                <repository>
                    <id>aliyun-central</id>
                    <name>Aliyun Central</name>
                    <url>https://maven.aliyun.com/repository/central</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>false</enabled>
                    </snapshots>
                </repository>
                <repository>
                    <id>aliyun-public</id>
                    <name>Aliyun Public</name>
                    <url>https://maven.aliyun.com/repository/public</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>true</enabled>
                    </snapshots>
                </repository>
            </repositories>
            <pluginRepositories>
                <pluginRepository>
                    <id>aliyun-plugin</id>
                    <name>Aliyun Plugin</name>
                    <url>https://maven.aliyun.com/repository/central</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>false</enabled>
                    </snapshots>
                </pluginRepository>
            </pluginRepositories>
        </profile>

        <!-- Spring Boot特定配置 -->
        <profile>
            <id>spring-boot</id>
            <repositories>
                <repository>
                    <id>spring-milestones</id>
                    <name>Spring Milestones</name>
                    <url>https://repo.spring.io/milestone</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>false</enabled>
                    </snapshots>
                </repository>
            </repositories>
        </profile>
    </profiles>

    <!-- 激活的profile -->
    <activeProfiles>
        <activeProfile>aliyun</activeProfile>
        <activeProfile>spring-boot</activeProfile>
    </activeProfiles>

</settings>
"@

# 备份现有配置
if (Test-Path $mavenSettingsPath) {
    $backupPath = "$mavenSettingsPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $mavenSettingsPath $backupPath
    Write-Host "已备份现有配置到: $backupPath" -ForegroundColor Green
}

# 写入新的配置
$settingsXml | Out-File -FilePath $mavenSettingsPath -Encoding UTF8

Write-Host "✅ Maven设置已更新" -ForegroundColor Green

# 显示配置内容
Write-Host "配置内容预览:" -ForegroundColor Yellow
Get-Content $mavenSettingsPath | Select-Object -First 20 | Write-Host
Write-Host "..." -ForegroundColor Gray

Write-Host "`n📋 下一步操作:" -ForegroundColor Cyan
Write-Host "1. 清理Maven缓存: mvn clean" -ForegroundColor White
Write-Host "2. 重新下载依赖: mvn dependency:resolve" -ForegroundColor White
Write-Host "3. 继续部署: .\deploy.ps1" -ForegroundColor White

# 清理可能的缓存问题
Write-Host "`n🧹 清理Maven缓存..." -ForegroundColor Yellow
$mavenRepository = "$mavenHome\.m2\repository"
if (Test-Path "$mavenRepository\org\springframework\boot\spring-boot-starter-parent") {
    Write-Host "发现Spring Boot缓存，建议清理" -ForegroundColor Yellow
    $choice = Read-Host "是否清理Spring Boot相关缓存? (y/N)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Remove-Item "$mavenRepository\org\springframework\boot" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Spring Boot缓存已清理" -ForegroundColor Green
    }
}

Write-Host "`n🎉 Maven配置完成！" -ForegroundColor Green