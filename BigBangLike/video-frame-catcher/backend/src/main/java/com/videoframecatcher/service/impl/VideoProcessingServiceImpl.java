package com.videoframecatcher.service.impl;

import com.videoframecatcher.entity.Album;
import com.videoframecatcher.entity.AlbumStatus;
import com.videoframecatcher.entity.Frame;
import com.videoframecatcher.repository.AlbumRepository;
import com.videoframecatcher.repository.FrameRepository;
import com.videoframecatcher.service.FFmpegService;
import com.videoframecatcher.service.GPUAccelerationService;
import com.videoframecatcher.service.StorageService;
import com.videoframecatcher.service.VideoProcessingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Transactional
public class VideoProcessingServiceImpl implements VideoProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(VideoProcessingServiceImpl.class);

    private final AlbumRepository albumRepository;
    private final FrameRepository frameRepository;
    private final FFmpegService ffmpegService;
    private final StorageService storageService;
    private final GPUAccelerationService gpuAccelerationService;

    // 处理进度跟踪
    private final ConcurrentHashMap<Long, Double> processingProgress = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> processingCancellation = new ConcurrentHashMap<>();

    @Value("${ffmpeg.frame-extraction.frames-per-second:1.0}")
    private double framesPerSecond;

    @Value("${ffmpeg.frame-extraction.max-parallel-threads:4}")
    private int maxParallelThreads;

    @Value("${image.processing.heic-quality:80}")
    private int heicQuality;

    @Value("${image.processing.thumbnail.width:200}")
    private int thumbnailWidth;

    @Value("${image.processing.thumbnail.height:200}")
    private int thumbnailHeight;

    @Value("${image.processing.thumbnail.quality:75}")
    private int thumbnailQuality;

    public VideoProcessingServiceImpl(
            AlbumRepository albumRepository,
            FrameRepository frameRepository,
            FFmpegService ffmpegService,
            StorageService storageService,
            GPUAccelerationService gpuAccelerationService) {
        this.albumRepository = albumRepository;
        this.frameRepository = frameRepository;
        this.ffmpegService = ffmpegService;
        this.storageService = storageService;
        this.gpuAccelerationService = gpuAccelerationService;
    }

    @Override
    @Async
    public void processVideoAsync(Long albumId) {
        try {
            processVideo(albumId);
        } catch (Exception e) {
            logger.error("Async video processing failed for album: {}", albumId, e);
            throw new RuntimeException(e);
        }
    }

    @Override
    public void processVideo(Long albumId) {
        logger.info("Starting video processing for album: {}", albumId);

        try {
            Album album = albumRepository.findById(albumId)
                    .orElseThrow(() -> new RuntimeException("Album not found: " + albumId));

            // 重置状态
            album.setStatus(AlbumStatus.PROCESSING);
            albumRepository.save(album);
            processingProgress.put(albumId, 0.0);
            processingCancellation.put(albumId, false);

            // 验证视频文件
            if (!ffmpegService.validateVideoFile(album.getVideoPath())) {
                throw new RuntimeException("Invalid video file");
            }

            // 提取视频元数据
            FFmpegServiceImpl.VideoMetadata metadata = ffmpegService.extractMetadata(album.getVideoPath());
            updateAlbumMetadata(album, metadata);

            // 提取帧
            extractAndProcessFrames(album);

            // 更新相册状态为完成
            album.setStatus(AlbumStatus.COMPLETED);
            albumRepository.save(album);
            processingProgress.put(albumId, 1.0);

            logger.info("Video processing completed successfully for album: {}", albumId);

        } catch (Exception e) {
            logger.error("Video processing failed for album: {}", albumId, e);

            // 更新相册状态为失败
            try {
                Album album = albumRepository.findById(albumId).orElse(null);
                if (album != null) {
                    album.setStatus(AlbumStatus.FAILED);
                    albumRepository.save(album);
                }
            } catch (Exception ex) {
                logger.error("Failed to update album status to FAILED", ex);
            }

            processingProgress.remove(albumId);
            processingCancellation.remove(albumId);

            throw new RuntimeException("Video processing failed", e);
        } finally {
            // 清理临时文件
            cleanupTempFiles();
        }
    }

    private void updateAlbumMetadata(Album album, FFmpegServiceImpl.VideoMetadata metadata) {
        album.setDuration(metadata.getDuration());
        album.setFrameRate(metadata.getFrameRate());
        album.setWidth(metadata.getWidth());
        album.setHeight(metadata.getHeight());
        album.setVideoCodec(metadata.getVideoCodec());
        albumRepository.save(album);
    }

    private void extractAndProcessFrames(Album album) throws IOException {
        String videoPath = album.getVideoPath();
        Long albumId = album.getId();

        // 创建临时目录
        String tempDir = System.getProperty("java.io.tmpdir") + "/vfc_" + albumId;
        Path tempPath = Paths.get(tempDir);
        java.nio.file.Files.createDirectories(tempPath);

        // 生成帧提取输出模式
        String framePattern = tempPath.toString() + "/frame_%06d.jpg";

        // 计算总帧数
        double duration = album.getDuration().doubleValue();
        int totalFrames = (int) Math.ceil(duration * framesPerSecond);

        logger.info("Extracting {} frames from video with duration {}s", totalFrames, duration);

        // 提取帧
        List<String> extractedFramePaths = ffmpegService.extractFrames(videoPath, framePattern, framesPerSecond);

        // 处理提取的帧
        List<Frame> frames = new ArrayList<>();
        AtomicInteger processedCount = new AtomicInteger(0);

        // 并行处理帧
        extractedFramePaths.parallelStream().forEach(framePath -> {
            try {
                if (processingCancellation.getOrDefault(albumId, false)) {
                    logger.info("Processing cancelled for album: {}", albumId);
                    return;
                }

                // 解析帧号
                String filename = Paths.get(framePath).getFileName().toString();
                int frameNumber = parseFrameNumber(filename);

                // 计算时间戳
                double timestamp = frameNumber / framesPerSecond;

                // 处理帧图像
                Frame frame = processFrame(albumId, frameNumber, timestamp, framePath);
                if (frame != null) {
                    synchronized (frames) {
                        frames.add(frame);
                    }
                }

                // 更新进度
                int processed = processedCount.incrementAndGet();
                double progress = (double) processed / totalFrames;
                processingProgress.put(albumId, Math.min(progress, 0.95)); // 留5%给最后的保存操作

                if (processed % 10 == 0) {
                    logger.info("Processed {}/{} frames for album: {}", processed, totalFrames, albumId);
                }

            } catch (Exception e) {
                logger.error("Failed to process frame: {}", framePath, e);
            }
        });

        // 批量保存帧数据
        if (!frames.isEmpty()) {
            frameRepository.saveAll(frames);
            logger.info("Saved {} frames to database for album: {}", frames.size(), albumId);
        }

        // 清理临时文件
        cleanupTempDirectory(tempPath);
    }

    private Frame processFrame(Long albumId, int frameNumber, double timestamp, String framePath) {
        try {
            // 检查GPU加速是否可用
            boolean useGPU = gpuAccelerationService.isGPUSupported();

            // 生成文件名
            String albumName = getAlbumName(albumId);
            String frameFilename = String.format("%s_%s_frame_%06d.heic",
                    albumName,
                    formatTimestamp(timestamp),
                    frameNumber);

            // 存储原始帧为HEIC格式
            byte[] frameData = java.nio.file.Files.readAllBytes(Paths.get(framePath));
            String heicPath;

            if (useGPU) {
                // 使用GPU加速处理
                heicPath = gpuAccelerationService.processWithGPU(framePath, frameFilename, heicQuality);
            } else {
                // CPU处理
                String tempHeicPath = System.getProperty("java.io.tmpdir") + "/temp_" + frameFilename;
                boolean converted = ffmpegService.convertToHEIC(framePath, tempHeicPath, heicQuality);

                if (converted) {
                    byte[] heicData = java.nio.file.Files.readAllBytes(Paths.get(tempHeicPath));
                    heicPath = storageService.storeFrame(albumId, frameNumber, heicData, "heic");
                    java.nio.file.Files.deleteIfExists(Paths.get(tempHeicPath));
                } else {
                    // HEIC转换失败，使用原始格式
                    heicPath = storageService.storeFrame(albumId, frameNumber, frameData, "jpg");
                }
            }

            // 生成缩略图
            String thumbnailPath = generateThumbnail(framePath, albumId, frameNumber);

            // 获取图像尺寸和质量分数
            java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(new File(framePath));
            int width = image.getWidth();
            int height = image.getHeight();
            double qualityScore = calculateQualityScore(image);

            // 获取Album对象用于设置关系
            Album albumEntity = albumRepository.findById(albumId).orElse(null);

            // 创建帧对象
            Frame frame = new Frame();
            frame.setAlbum(albumEntity);
            frame.setFilename(frameFilename);
            frame.setFilePath(heicPath);
            frame.setTimestamp(BigDecimal.valueOf(timestamp).setScale(3, RoundingMode.HALF_UP));
            frame.setFrameNumber(frameNumber);
            frame.setWidth(width);
            frame.setHeight(height);
            frame.setFileSize((long) frameData.length);
            frame.setFormat(heicPath.endsWith(".heic") ? "heic" : "jpg");
            frame.setQualityScore(BigDecimal.valueOf(qualityScore).setScale(2, RoundingMode.HALF_UP));
            frame.setThumbnailPath(thumbnailPath);

            return frame;

        } catch (Exception e) {
            logger.error("Failed to process frame {}: {}", frameNumber, framePath, e);
            return null;
        }
    }

    private String generateThumbnail(String framePath, Long albumId, int frameNumber) {
        String tempThumbnailPath = System.getProperty("java.io.tmpdir") + "/thumb_" + frameNumber + ".jpg";

        boolean generated = ffmpegService.generateThumbnail(
                framePath,
                tempThumbnailPath,
                thumbnailWidth,
                thumbnailHeight,
                thumbnailQuality
        );

        if (generated) {
            try {
                byte[] thumbnailData = java.nio.file.Files.readAllBytes(Paths.get(tempThumbnailPath));
                String thumbnailPath = storageService.storeThumbnail(albumId, frameNumber, thumbnailData);
                java.nio.file.Files.deleteIfExists(Paths.get(tempThumbnailPath));
                return thumbnailPath;
            } catch (IOException e) {
                logger.error("Failed to store thumbnail for frame: {}", frameNumber, e);
            }
        }

        return null;
    }

    private double calculateQualityScore(java.awt.image.BufferedImage image) {
        // 简单的质量分数计算（可以后续改进）
        // 基于图像的对比度、清晰度等因素
        try {
            // 这里可以实现更复杂的质量评估算法
            // 暂时返回基于图像大小的简单评分
            int width = image.getWidth();
            int height = image.getHeight();
            return Math.min(1.0, (width * height) / (1920.0 * 1080.0));
        } catch (Exception e) {
            return 0.5; // 默认值
        }
    }

    @Override
    public double getProcessingProgress(Long albumId) {
        return processingProgress.getOrDefault(albumId, 0.0);
    }

    @Override
    public void stopProcessing(Long albumId) {
        logger.info("Stopping video processing for album: {}", albumId);
        processingCancellation.put(albumId, true);
    }

    private int parseFrameNumber(String filename) {
        try {
            String numberStr = filename.replaceAll("[^0-9]", "");
            return Integer.parseInt(numberStr);
        } catch (NumberFormatException e) {
            logger.warn("Failed to parse frame number from filename: {}", filename);
            return 0;
        }
    }

    private String formatTimestamp(double timestamp) {
        int hours = (int) (timestamp / 3600);
        int minutes = (int) ((timestamp % 3600) / 60);
        int seconds = (int) (timestamp % 60);
        return String.format("%02d_%02d_%02d", hours, minutes, seconds);
    }

    private String getAlbumName(Long albumId) {
        try {
            Album album = albumRepository.findById(albumId).orElse(null);
            if (album != null) {
                return album.getName().replaceAll("[^a-zA-Z0-9_-]", "_");
            }
        } catch (Exception e) {
            logger.warn("Failed to get album name for ID: {}", albumId, e);
        }
        return "album_" + albumId;
    }

    private void cleanupTempDirectory(Path tempPath) {
        try {
            if (java.nio.file.Files.exists(tempPath)) {
                java.nio.file.Files.walk(tempPath)
                        .sorted((a, b) -> -a.compareTo(b))
                        .forEach(path -> {
                            try {
                                java.nio.file.Files.delete(path);
                            } catch (IOException e) {
                                logger.warn("Failed to delete temp file: {}", path, e);
                            }
                        });
            }
        } catch (IOException e) {
            logger.warn("Failed to cleanup temp directory: {}", tempPath, e);
        }
    }

    private void cleanupTempFiles() {
        // 清理遗留的临时文件
        try {
            String tempDir = System.getProperty("java.io.tmpdir");
            java.nio.file.Files.walk(Paths.get(tempDir))
                    .filter(path -> path.getFileName().toString().startsWith("vfc_"))
                    .forEach(path -> {
                        try {
                            java.nio.file.Files.delete(path);
                        } catch (IOException e) {
                            logger.warn("Failed to delete temp file: {}", path, e);
                        }
                    });
        } catch (IOException e) {
            logger.warn("Failed to cleanup temp files", e);
        }
    }
}