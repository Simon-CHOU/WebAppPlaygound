package com.videoframecatcher.service.impl;

import com.videoframecatcher.service.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.UUID;

@Service
public class LocalStorageServiceImpl implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalStorageServiceImpl.class);

    @Value("${storage.local.base-path:./storage}")
    private String basePath;

    @Value("${storage.local.temp-path:./temp}")
    private String tempPath;

    @Override
    public String storeVideo(MultipartFile videoFile, Long albumId) {
        try {
            // 创建相册目录结构
            String albumBasePath = createAlbumDirectory(albumId);
            String videoDir = Paths.get(albumBasePath, "video").toString();

            // 确保目录存在
            Files.createDirectories(Paths.get(videoDir));

            // 生成唯一文件名
            String originalFilename = StringUtils.cleanPath(videoFile.getOriginalFilename());
            String extension = getFileExtension(originalFilename);
            String filename = "original" + (extension != null ? "." + extension : "");

            Path targetLocation = Paths.get(videoDir, filename);

            // 保存文件
            Files.copy(videoFile.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            logger.info("Video file stored successfully: {}", targetLocation);
            return targetLocation.toString();

        } catch (IOException e) {
            logger.error("Failed to store video file", e);
            throw new RuntimeException("Failed to store video file", e);
        }
    }

    @Override
    public String storeFrame(Long albumId, Integer frameNumber, byte[] imageData, String format) {
        try {
            String albumBasePath = createAlbumDirectory(albumId);
            String framesDir = Paths.get(albumBasePath, "frames", "original").toString();

            Files.createDirectories(Paths.get(framesDir));

            String filename = String.format("frame_%06d.%s", frameNumber, format);
            Path targetLocation = Paths.get(framesDir, filename);

            Files.write(targetLocation, imageData);

            logger.debug("Frame stored: {}", targetLocation);
            return targetLocation.toString();

        } catch (IOException e) {
            logger.error("Failed to store frame", e);
            throw new RuntimeException("Failed to store frame", e);
        }
    }

    @Override
    public String storeThumbnail(Long albumId, Integer frameNumber, byte[] thumbnailData) {
        try {
            String albumBasePath = createAlbumDirectory(albumId);
            String thumbnailsDir = Paths.get(albumBasePath, "frames", "thumbnails").toString();

            Files.createDirectories(Paths.get(thumbnailsDir));

            String filename = String.format("frame_%06d_thumb.jpg", frameNumber);
            Path targetLocation = Paths.get(thumbnailsDir, filename);

            Files.write(targetLocation, thumbnailData);

            logger.debug("Thumbnail stored: {}", targetLocation);
            return targetLocation.toString();

        } catch (IOException e) {
            logger.error("Failed to store thumbnail", e);
            throw new RuntimeException("Failed to store thumbnail", e);
        }
    }

    @Override
    public Resource loadFile(String filePath) {
        try {
            Path file = Paths.get(filePath);
            Resource resource = new FileSystemResource(file);

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                logger.warn("File not found or not readable: {}", filePath);
                throw new RuntimeException("File not found or not readable: " + filePath);
            }
        } catch (Exception e) {
            logger.error("Failed to load file: {}", filePath, e);
            throw new RuntimeException("Failed to load file: " + filePath, e);
        }
    }

    @Override
    public InputStream loadFileAsStream(String filePath) {
        try {
            Path file = Paths.get(filePath);
            if (Files.exists(file) && Files.isReadable(file)) {
                return Files.newInputStream(file);
            } else {
                throw new RuntimeException("File not found or not readable: " + filePath);
            }
        } catch (IOException e) {
            logger.error("Failed to load file as stream: {}", filePath, e);
            throw new RuntimeException("Failed to load file as stream: " + filePath, e);
        }
    }

    @Override
    public void deleteFile(String filePath) {
        try {
            Path file = Paths.get(filePath);
            if (Files.exists(file)) {
                Files.delete(file);
                logger.debug("File deleted: {}", filePath);
            } else {
                logger.warn("Attempted to delete non-existent file: {}", filePath);
            }
        } catch (IOException e) {
            logger.error("Failed to delete file: {}", filePath, e);
            throw new RuntimeException("Failed to delete file: " + filePath, e);
        }
    }

    @Override
    public void deleteAlbumDirectory(Long albumId) {
        try {
            String albumBasePath = Paths.get(basePath, "albums", albumId.toString()).toString();
            Path albumPath = Paths.get(albumBasePath);

            if (Files.exists(albumPath)) {
                // 递归删除目录
                Files.walk(albumPath)
                    .sorted((a, b) -> -a.compareTo(b))
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            logger.error("Failed to delete file: {}", path, e);
                        }
                    });
                logger.info("Album directory deleted: {}", albumBasePath);
            }
        } catch (IOException e) {
            logger.error("Failed to delete album directory: {}", albumId, e);
            throw new RuntimeException("Failed to delete album directory", e);
        }
    }

    @Override
    public String createAlbumDirectory(Long albumId) {
        try {
            String albumBasePath = Paths.get(basePath, "albums", albumId.toString()).toString();
            Path albumPath = Paths.get(albumBasePath);

            // 创建相册目录结构
            Files.createDirectories(albumPath);
            Files.createDirectories(Paths.get(albumBasePath, "video"));
            Files.createDirectories(Paths.get(albumBasePath, "frames", "original"));
            Files.createDirectories(Paths.get(albumBasePath, "frames", "thumbnails"));
            Files.createDirectories(Paths.get(albumBasePath, "metadata"));

            logger.info("Album directory created: {}", albumBasePath);
            return albumBasePath;
        } catch (IOException e) {
            logger.error("Failed to create album directory: {}", albumId, e);
            throw new RuntimeException("Failed to create album directory", e);
        }
    }

    @Override
    public boolean fileExists(String filePath) {
        return Files.exists(Paths.get(filePath));
    }

    @Override
    public long getFileSize(String filePath) {
        try {
            return Files.size(Paths.get(filePath));
        } catch (IOException e) {
            logger.error("Failed to get file size: {}", filePath, e);
            return 0;
        }
    }

    public String storeTempFile(MultipartFile file) {
        try {
            Files.createDirectories(Paths.get(tempPath));

            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String extension = getFileExtension(originalFilename);
            String filename = UUID.randomUUID().toString() + (extension != null ? "." + extension : "");

            Path targetLocation = Paths.get(tempPath, filename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return targetLocation.toString();
        } catch (IOException e) {
            logger.error("Failed to store temp file", e);
            throw new RuntimeException("Failed to store temp file", e);
        }
    }

    public void cleanupTempFiles() {
        try {
            Path tempDir = Paths.get(tempPath);
            if (Files.exists(tempDir)) {
                Files.walk(tempDir)
                    .filter(path -> !Files.isDirectory(path))
                    .forEach(path -> {
                        try {
                            // 删除超过1小时的临时文件
                            long age = System.currentTimeMillis() - Files.getLastModifiedTime(path).toMillis();
                            if (age > 3600000) { // 1小时
                                Files.delete(path);
                                logger.debug("Temp file cleaned up: {}", path);
                            }
                        } catch (IOException e) {
                            logger.error("Failed to delete temp file: {}", path, e);
                        }
                    });
            }
        } catch (IOException e) {
            logger.error("Failed to cleanup temp files", e);
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return null;
        }
        int lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : null;
    }
}