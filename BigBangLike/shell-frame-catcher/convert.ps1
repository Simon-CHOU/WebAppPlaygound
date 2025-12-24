# 1. 参数配置
$inputFile = "SVID_20251221_224928_1.mp4"
$outputDir = "output_final"
$tempDir = "temp_10bit_raw"
$maxThreads = 12

# 2. 初始化
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory $outputDir -Force }
if (!(Test-Path $tempDir)) { New-Item -ItemType Directory $tempDir -Force }

Write-Host "`n>>> [Phase 1/2] 正在调用 Intel A380 硬件提取 10-bit 无损帧..." -ForegroundColor Cyan
ffmpeg -hwaccel qsv -hwaccel_output_format qsv -c:v h264_qsv -i $inputFile `
    -vf "vpp_qsv=format=p010,hwdownload,format=p010" `
    -f image2 -c:v bmp -y "$tempDir/f_%04d.bmp" -loglevel warning

$files = Get-ChildItem "$tempDir/*.bmp"
$totalFiles = $files.Count
if ($totalFiles -eq 0) { Write-Error "提取失败"; exit }

Write-Host ">>> [Phase 2/2] 正在并行转换 WebP (12 线程并发)..." -ForegroundColor Cyan

# 计数器用于进度条
$counter = 0

# 并行编码逻辑
$files | ForEach-Object -Parallel {
    # 重新声明内部变量
    $target = Join-Path $using:outputDir ($_.BaseName + ".webp")
    
    # 转换 WebP: -q:v 80 兼顾画质与体积，Windows 11 完美兼容
    & ffmpeg -i $_.FullName -c:v libwebp -lossless 0 -compression_level 4 -q:v 80 $target -y -loglevel error
    
    # 更新进度 (静默增加)
} -ThrottleLimit $maxThreads

# 打印最终整洁的报告
Write-Host "`n>>> [SUCCESS] 处理完成！" -ForegroundColor Green
Write-Host ">>> 总计生成的帧数: $totalFiles"
Write-Host ">>> 输出路径: $(Get-Item $outputDir)\" -ForegroundColor Gray

# 3. 清理
Remove-Item -Path $tempDir -Recurse -Force