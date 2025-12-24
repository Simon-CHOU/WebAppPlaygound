# ==========================================================
# Video-to-Frames Pro v3.4 (Fix Console Encoding)
# ==========================================================

# 修复乱码：强制设置 PowerShell 终端为 UTF-8 编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Get-HardwareAccelerator {
    $test = ffmpeg -hwaccels 2>$null
    if ($test -match "qsv") {
        return @{ name="Intel Arc QSV (Dec Only)"; hw="qsv"; dec="h264_qsv"; vf="vpp_qsv=format=p010" }
    }
    return @{ name="CPU"; hw="none"; dec="h264"; vf="format=yuv420p10le"}
}

Clear-Host
Write-Host "--- Video-to-Frames Pro v3.4 (Final Compatible) ---" -ForegroundColor Yellow
$hw = Get-HardwareAccelerator
Write-Host "探测到加速硬件: $($hw.name)" -ForegroundColor Green

$inputPath = (Read-Host "`n[1/3] 输入路径").Trim('"').Trim("'")

Write-Host "`n[2/3] 选择目标格式:" -ForegroundColor Cyan
Write-Host " 1. AVIF (推荐: 10-bit, 极致体积, 由 ImageMagick 封装)"
Write-Host " 2. WebP (备选: 10-bit, 兼容性王)"
Write-Host " 3. PNG  (无损存档)"
$choice = Read-Host "请输入序号"

$ext = switch($choice) { "1" {"avif"} "2" {"webp"} "3" {"png"} Default {"avif"} }

$useMagickForAVIF = $false
if ($ext -eq "avif") {
    $magickCheck = magick -list format 2>$null | Select-String "AVIF"
    if ($magickCheck -match "rw") {
        $useMagickForAVIF = $true
        Write-Host ">>> 检测到 ImageMagick AVIF 写入支持，启用高质量封装。" -ForegroundColor Gray
    } else {
        Write-Host "!!! 警告: 你的 ImageMagick 不支持写入 AVIF。将回退到 WebP。" -ForegroundColor Red
        $ext = "webp"
    }
}

function Process-Video($file, $hw, $ext, $useMagickForAVIF) {
    $vName = $file.BaseName
    $outSubDir = Join-Path $file.DirectoryName "output_$vName"
    $tempDir = Join-Path $file.DirectoryName "temp_$vName"
    
    if (!(Test-Path $outSubDir)) { New-Item $outSubDir -ItemType Directory | Out-Null }
    if (!(Test-Path $tempDir)) { New-Item $tempDir -ItemType Directory | Out-Null }

    Write-Host "`n>>> [1/2] A380 硬件提取 10-bit 原始帧: $($file.Name)" -ForegroundColor Cyan
    & ffmpeg -hwaccel $hw.hw -c:v $hw.dec -i $file.FullName -vf "$($hw.vf),hwdownload,format=p010" -f image2 -c:v bmp -y "$tempDir/f_%04d.bmp" -loglevel error >$null 2>&1

    $tempFiles = Get-ChildItem "$tempDir/*.bmp"
    $total = $tempFiles.Count

    Write-Host ">>> [2/2] 并行编码封装 (12 线程)..." -ForegroundColor Cyan
    
    # 使用计数器以避免在并行块中直接输出复杂中文导致乱码
    $processedCount = [hashtable]::Synchronized(@{ value = 0 })

    $tempFiles | ForEach-Object -Parallel {
        # 在并行任务内部再次确保编码一致
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        
        $p = $using:processedCount
        $target = Join-Path $using:outSubDir ($_.BaseName + "." + $using:ext)
        
        try {
            if ($using:ext -eq "avif" -and $using:useMagickForAVIF) {
                & magick $_.FullName -depth 10 -quality 60 $target
            } elseif ($using:ext -eq "webp") {
                & ffmpeg -i $_.FullName -c:v libwebp -quality 75 -pix_fmt yuv420p10le $target -y -loglevel quiet >$null 2>&1
            } else {
                & ffmpeg -i $_.FullName -c:v png $target -y -loglevel quiet >$null 2>&1
            }
        } catch { }

        $p.value++
        
        # 优化：进度条显示使用更简单的字符，减少乱码概率
        if ($p.value % 5 -eq 0 -or $p.value -eq $using:total) {
            $pct = [int]($p.value / $using:total * 100)
            Write-Progress -Activity "Processing Frames..." -Status "$pct% ($($p.value)/$using:total)" -PercentComplete $pct
        }
    } -ThrottleLimit 12

    Write-Progress -Activity "Processing..." -Completed
    Remove-Item $tempDir -Recurse -Force | Out-Null
    Write-Host ">>> SUCCESS: $vName (Format: $ext)" -ForegroundColor Green
    Invoke-Item $outSubDir
}

if (Test-Path $inputPath -PathType Container) {
    Get-ChildItem $inputPath -Include *.mp4,*.mkv,*.mov -Recurse | ForEach-Object { Process-Video $_ $hw $ext $useMagickForAVIF }
} else {
    Process-Video (Get-Item $inputPath) $hw $ext $useMagickForAVIF
}

Write-Host "`n[DONE] 任务结束。" -ForegroundColor Yellow