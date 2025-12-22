import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
}

export const ffmpegService = {
  async getVideoInfo(inputPath: string): Promise<VideoInfo> {
    try {
      const command = `ffprobe -v error -select_streams v:0 -show_entries stream=duration,width,height,r_frame_rate -of csv=p=0 "${inputPath}"`;
      const { stdout } = await execAsync(command);
      
      const [duration, width, height, frameRate] = stdout.trim().split(',');
      const fps = eval(frameRate); // 处理像 "30000/1001" 这样的分数
      const totalFrames = Math.floor(parseFloat(duration) * fps);
      
      return {
        duration: parseFloat(duration),
        width: parseInt(width),
        height: parseInt(height),
        fps,
        totalFrames
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error}`);
    }
  },

  async extractFrames(
    inputPath: string, 
    outputDir: string, 
    albumName: string,
    onProgress?: (currentFrame: number, totalFrames: number) => void
  ): Promise<string[]> {
    try {
      // 确保输出目录存在
      await fs.mkdir(outputDir, { recursive: true });
      
      // 获取视频信息
      const videoInfo = await this.getVideoInfo(inputPath);
      
      // 构建输出文件路径模式
      const outputPattern = path.join(outputDir, `${albumName}_%04d.png`);
      
      // 自动检测编码格式并使用合适的解码器
      // 先尝试检测视频编码格式
      const probeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
      const { stdout: codecName } = await execAsync(probeCommand);
      
      let decoder = '';
      const codec = codecName.trim().toLowerCase();
      
      if (codec === 'h264' || codec === 'avc') {
        decoder = '-c:v h264_qsv';
      } else if (codec === 'hevc' || codec === 'h265') {
        decoder = '-c:v hevc_qsv';
      } else if (codec === 'av1') {
        decoder = '-c:v av1_qsv';
      } else {
        // 未知编码格式，使用软件解码
        decoder = '';
      }
      
      // 构建滤镜链
      // 如果使用了硬件解码，需要先下载到内存才能进行软件处理（如保存为PNG）
      const vfFilters = [];
      if (decoder) {
        vfFilters.push('hwdownload');
        vfFilters.push('format=nv12');
      }
      vfFilters.push(`fps=${videoInfo.fps}`);
      const vf = vfFilters.join(',');

      // 使用Intel QSV硬件加速提取帧（自动适配编码格式）
      // 如果是软件解码，不强制使用 -hwaccel qsv，避免兼容性问题
      const hwAccelFlag = decoder ? '-hwaccel qsv' : '';
      const commandStr = `ffmpeg ${hwAccelFlag} ${decoder} -i "${inputPath}" -vf "${vf}" "${outputPattern}"`;
      
      // 使用 spawn 执行命令以获取进度
      await new Promise<void>((resolve, reject) => {
        const child = spawn(commandStr, { shell: true });
        
        child.stderr.on('data', (data) => {
          const str = data.toString();
          // 解析进度: frame=  123
          const match = str.match(/frame=\s*(\d+)/);
          if (match && onProgress) {
            const currentFrame = parseInt(match[1]);
            // 限制最大帧数不超过总帧数
            onProgress(Math.min(currentFrame, videoInfo.totalFrames), videoInfo.totalFrames);
          }
        });

        child.on('error', (err) => {
          reject(err);
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
      });
      
      // 获取生成的所有帧文件
      const files = await fs.readdir(outputDir);
      const frameFiles = files
        .filter(file => file.startsWith(albumName) && file.endsWith('.png'))
        .sort();
      
      return frameFiles.map(file => path.join(outputDir, file));
    } catch (error) {
      throw new Error(`Failed to extract frames: ${error}`);
    }
  },

  async convertToHEIC(
    inputPath: string, 
    outputPath: string,
    quality: number = 80
  ): Promise<void> {
    try {
      // 这里的 FFmpeg 构建似乎没有包含 libheif 编码器或 heif 封装器
      // 使用 libx265 编码器生成 HEVC 内容，并封装在 MP4 容器中
      // 虽然容器是 MP4，但 HEIC 本质上也是 ISOBMFF 格式，大多数查看器都能识别
      // 映射 quality (0-100) 到 CRF (0-51)，quality 100 -> CRF 0
      const crf = Math.round((100 - quality) * 0.51);
      
      const command = `ffmpeg -y -i "${inputPath}" -c:v libx265 -crf ${crf} -pix_fmt yuv420p -tag:v hvc1 -f mp4 "${outputPath}"`;
      
      await execAsync(command);
    } catch (error) {
      throw new Error(`Failed to convert to HEIC: ${error}`);
    }
  },

  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = 320
  ): Promise<void> {
    try {
      // 生成缩略图，高度自适应
      const command = `ffmpeg -y -i "${inputPath}" -vf "scale=${width}:-1" -q:v 2 "${outputPath}"`;
      await execAsync(command);
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error}`);
    }
  },

  async processVideoToHEIC(
    inputPath: string,
    outputDir: string,
    albumName: string,
    onProgress?: (currentFrame: number, totalFrames: number) => void
  ): Promise<string[]> {
    try {
      // 阶段1：提取帧 (占比 40%)
      const extractWeight = 0.4;
      // 阶段2：转换 HEIC (占比 60%)
      const convertWeight = 0.6;
      
      let totalFrames = 0;
      
      // 包装 onProgress 回调以支持加权进度
      const handleExtractProgress = (current: number, total: number) => {
        totalFrames = total;
        if (onProgress) {
          const weightedProgress = Math.floor(current * extractWeight);
          onProgress(weightedProgress, total);
        }
      };

      // 提取所有帧为PNG
      const pngFiles = await this.extractFrames(inputPath, outputDir, albumName, handleExtractProgress);
      
      // 如果 extractFrames 没有正确获取到 totalFrames，这里使用 pngFiles.length 修正
      if (totalFrames === 0) totalFrames = pngFiles.length;

      // 转换为HEIC格式
      const heicFiles: string[] = [];
      
      const baseProgress = Math.floor(totalFrames * extractWeight);
      
      for (let i = 0; i < pngFiles.length; i++) {
        const pngFile = pngFiles[i];
        const heicFile = pngFile.replace('.png', '.heic');
        const thumbFile = pngFile.replace('.png', '_thumb.jpg');
        
        // 并行执行 HEIC 转换和缩略图生成
        await Promise.all([
          this.convertToHEIC(pngFile, heicFile),
          this.generateThumbnail(pngFile, thumbFile)
        ]);
        
        heicFiles.push(heicFile);
        
        // 删除临时PNG文件
        await fs.unlink(pngFile);
        
        // 报告进度
        if (onProgress) {
          // 转换阶段进度
          const convertProgress = Math.floor(((i + 1) / pngFiles.length) * (totalFrames * convertWeight));
          onProgress(baseProgress + convertProgress, totalFrames);
        }
      }
      
      return heicFiles;
    } catch (error) {
      throw new Error(`Failed to process video to HEIC: ${error}`);
    }
  }
};