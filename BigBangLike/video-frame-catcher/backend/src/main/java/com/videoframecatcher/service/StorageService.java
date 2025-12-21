package com.videoframecatcher.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

public interface StorageService {

    /**
     * 存储上传的视频文件
     * @param videoFile 视频文件
     * @param albumId 相册ID
     * @return 文件存储路径
     */
    String storeVideo(MultipartFile videoFile, Long albumId);

    /**
     * 存储帧图像文件
     * @param albumId 相册ID
     * @param frameNumber 帧号
     * @param imageData 图像数据
     * @param format 图像格式
     * @return 文件存储路径
     */
    String storeFrame(Long albumId, Integer frameNumber, byte[] imageData, String format);

    /**
     * 存储缩略图文件
     * @param albumId 相册ID
     * @param frameNumber 帧号
     * @param thumbnailData 缩略图数据
     * @return 缩略图存储路径
     */
    String storeThumbnail(Long albumId, Integer frameNumber, byte[] thumbnailData);

    /**
     * 加载文件
     * @param filePath 文件路径
     * @return 文件资源
     */
    Resource loadFile(String filePath);

    /**
     * 获取文件输入流
     * @param filePath 文件路径
     * @return 输入流
     */
    InputStream loadFileAsStream(String filePath);

    /**
     * 删除文件
     * @param filePath 文件路径
     */
    void deleteFile(String filePath);

    /**
     * 删除相册目录
     * @param albumId 相册ID
     */
    void deleteAlbumDirectory(Long albumId);

    /**
     * 创建相册目录结构
     * @param albumId 相册ID
     * @return 基础路径
     */
    String createAlbumDirectory(Long albumId);

    /**
     * 检查文件是否存在
     * @param filePath 文件路径
     * @return 是否存在
     */
    boolean fileExists(String filePath);

    /**
     * 获取文件大小
     * @param filePath 文件路径
     * @return 文件大小（字节）
     */
    long getFileSize(String filePath);
}