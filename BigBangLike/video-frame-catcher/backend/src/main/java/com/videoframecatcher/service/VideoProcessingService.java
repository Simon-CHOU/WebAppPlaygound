package com.videoframecatcher.service;

import org.springframework.scheduling.annotation.Async;

public interface VideoProcessingService {

    /**
     * 异步处理视频
     * @param albumId 相册ID
     */
    @Async
    void processVideoAsync(Long albumId);

    /**
     * 同步处理视频（用于测试）
     * @param albumId 相册ID
     */
    void processVideo(Long albumId);

    /**
     * 获取处理进度
     * @param albumId 相册ID
     * @return 处理进度 (0.0 - 1.0)
     */
    double getProcessingProgress(Long albumId);

    /**
     * 停止处理
     * @param albumId 相册ID
     */
    void stopProcessing(Long albumId);
}