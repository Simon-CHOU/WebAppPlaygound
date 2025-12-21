package com.videoframecatcher.service;

import com.videoframecatcher.service.impl.FFmpegServiceImpl;

import java.util.List;

public interface FFmpegService {

    /**
     * 提取视频元数据
     * @param videoPath 视频文件路径
     * @return 视频元数据
     */
    FFmpegServiceImpl.VideoMetadata extractMetadata(String videoPath);

    /**
     * 从视频提取帧
     * @param videoPath 视频文件路径
     * @param outputPattern 输出文件模式（例如: "/path/to/output_%06d.jpg"）
     * @param framesPerSecond 每秒提取的帧数
     * @return 提取的帧文件路径列表
     */
    List<String> extractFrames(String videoPath, String outputPattern, double framesPerSecond);

    /**
     * 将图像转换为HEIC格式
     * @param inputPath 输入文件路径
     * @param outputPath 输出文件路径
     * @param quality 质量 (0-100)
     * @return 转换是否成功
     */
    boolean convertToHEIC(String inputPath, String outputPath, int quality);

    /**
     * 生成缩略图
     * @param inputPath 输入文件路径
     * @param outputPath 输出文件路径
     * @param width 宽度
     * @param height 高度
     * @param quality 质量 (0-100)
     * @return 生成是否成功
     */
    boolean generateThumbnail(String inputPath, String outputPath, int width, int height, int quality);

    /**
     * 验证视频文件是否有效
     * @param videoPath 视频文件路径
     * @return 是否有效
     */
    boolean validateVideoFile(String videoPath);

    /**
     * 执行FFmpeg命令
     * @param command 命令参数列表
     * @return 执行结果
     */
    FFmpegServiceImpl.ProcessResult executeCommand(List<String> command) throws Exception;
}