package com.videoframecatcher.service;

import com.videoframecatcher.dto.AlbumCreateRequest;
import com.videoframecatcher.dto.AlbumDTO;
import com.videoframecatcher.dto.AlbumStatisticsDTO;
import com.videoframecatcher.entity.Album;
import com.videoframecatcher.entity.AlbumStatus;
import com.videoframecatcher.repository.AlbumRepository;
import com.videoframecatcher.repository.FrameRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class AlbumService {

    private static final Logger logger = LoggerFactory.getLogger(AlbumService.class);

    private final AlbumRepository albumRepository;
    private final FrameRepository frameRepository;
    private final VideoProcessingService videoProcessingService;
    private final StorageService storageService;

    public AlbumService(AlbumRepository albumRepository, FrameRepository frameRepository,
                       VideoProcessingService videoProcessingService, StorageService storageService) {
        this.albumRepository = albumRepository;
        this.frameRepository = frameRepository;
        this.videoProcessingService = videoProcessingService;
        this.storageService = storageService;
    }

    public AlbumDTO createAlbum(AlbumCreateRequest request) {
        try {
            // 验证视频文件
            if (request.getVideoFile() == null || request.getVideoFile().isEmpty()) {
                throw new IllegalArgumentException("Video file is required");
            }

            String originalFilename = request.getVideoFile().getOriginalFilename();
            if (originalFilename == null || originalFilename.isEmpty()) {
                throw new IllegalArgumentException("Video filename is required");
            }

            // 验证文件格式
            String filename = originalFilename.toLowerCase();
            if (!filename.endsWith(".mp4") && !filename.endsWith(".avi") &&
                !filename.endsWith(".mov") && !filename.endsWith(".mkv")) {
                throw new IllegalArgumentException("Unsupported video format. Supported formats: MP4, AVI, MOV, MKV");
            }

            // 验证文件大小 (最大2GB)
            long maxFileSize = 2L * 1024 * 1024 * 1024; // 2GB
            if (request.getVideoFile().getSize() > maxFileSize) {
                throw new IllegalArgumentException("Video file too large. Maximum size: 2GB");
            }

            // 创建相册记录
            Album album = new Album();
            album.setName(request.getName());
            album.setOriginalFilename(originalFilename);
            album.setFileSize(request.getVideoFile().getSize());
            album.setStatus(AlbumStatus.PROCESSING);

            // 保存相册记录
            Album savedAlbum = albumRepository.save(album);

            // 存储视频文件
            String videoPath = storageService.storeVideo(request.getVideoFile(), savedAlbum.getId());
            savedAlbum.setVideoPath(videoPath);

            // 更新相册记录
            savedAlbum = albumRepository.save(savedAlbum);

            // 启动异步视频处理
            videoProcessingService.processVideoAsync(savedAlbum.getId());

            logger.info("Album created successfully: {} for video: {}", savedAlbum.getId(), originalFilename);
            return convertToDTO(savedAlbum);

        } catch (Exception e) {
            logger.error("Failed to create album", e);
            throw new RuntimeException("Failed to create album: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Page<AlbumDTO> getAllAlbums(Pageable pageable) {
        Page<Album> albums = albumRepository.findAll(pageable);
        return albums.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public AlbumDTO getAlbumById(Long id) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Album not found: " + id));
        return convertToDTO(album);
    }

    @Transactional(readOnly = true)
    public Page<AlbumDTO> searchAlbums(String keyword, Pageable pageable) {
        Page<Album> albums = albumRepository.findByNameContainingIgnoreCase(keyword, pageable);
        return albums.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public AlbumStatisticsDTO getAlbumStatistics() {
        long totalAlbums = albumRepository.count();
        long processingAlbums = albumRepository.countByStatus(AlbumStatus.PROCESSING);
        long completedAlbums = albumRepository.countByStatus(AlbumStatus.COMPLETED);
        long failedAlbums = albumRepository.countByStatus(AlbumStatus.FAILED);

        // 获取各状态相册数量
        List<Object[]> albumStats = albumRepository.getAlbumStatistics();
        Map<String, Long> albumsByStatus = new HashMap<>();
        for (Object[] stat : albumStats) {
            albumsByStatus.put(String.valueOf(stat[0]), (Long) stat[1]);
        }

        // 获取帧统计信息
        List<Object[]> frameStats = frameRepository.getFrameStatisticsByAlbum();
        long totalFrames = frameStats.stream().mapToLong(stat -> (Long) stat[1]).sum();
        long totalFavoriteFrames = frameStats.stream().mapToLong(stat -> (Long) stat[3]).sum();
        long totalStorageUsed = frameStats.stream().mapToLong(stat -> (Long) stat[2]).sum();

        return new AlbumStatisticsDTO(
                totalAlbums, processingAlbums, completedAlbums, failedAlbums,
                totalFrames, totalFavoriteFrames, totalStorageUsed, albumsByStatus
        );
    }

    public void deleteAlbum(Long id) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Album not found: " + id));

        // TODO: 删除相关的文件存储
        // TODO: 停止正在进行的处理任务

        albumRepository.delete(album);
    }

    public AlbumDTO retryProcessing(Long id) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Album not found: " + id));

        if (album.getStatus() != AlbumStatus.FAILED) {
            throw new RuntimeException("Album is not in failed status: " + id);
        }

        album.setStatus(AlbumStatus.PROCESSING);
        albumRepository.save(album);

        // 重新启动处理
        videoProcessingService.processVideoAsync(album.getId());

        return convertToDTO(album);
    }

    @Transactional(readOnly = true)
    public long getProcessingAlbumsCount() {
        return albumRepository.countProcessingAlbums();
    }

    private AlbumDTO convertToDTO(Album album) {
        AlbumDTO dto = new AlbumDTO();
        dto.setId(album.getId());
        dto.setName(album.getName());
        dto.setOriginalFilename(album.getOriginalFilename());
        dto.setVideoPath(album.getVideoPath());
        dto.setFileSize(album.getFileSize());
        dto.setDuration(album.getDuration());
        dto.setFrameRate(album.getFrameRate());
        dto.setWidth(album.getWidth());
        dto.setHeight(album.getHeight());
        dto.setVideoCodec(album.getVideoCodec());
        dto.setStorageType(album.getStorageType());
        dto.setStoragePath(album.getStoragePath());
        dto.setStatus(album.getStatus());
        dto.setCreatedAt(album.getCreatedAt());
        dto.setUpdatedAt(album.getUpdatedAt());

        // 获取帧统计信息
        if (album.getId() != null) {
            long frameCount = frameRepository.countByAlbumId(album.getId());
            long favoriteCount = frameRepository.countFavoriteFramesByAlbumId(album.getId());
            long totalFrameSize = frameRepository.getTotalFileSizeByAlbumId(album.getId());

            dto.setFrameCount(frameCount);
            dto.setFavoriteCount(favoriteCount);
            dto.setTotalFrameSize(totalFrameSize);

            // 计算处理进度
            if (album.getStatus() == AlbumStatus.PROCESSING && album.getDuration() != null) {
                // TODO: 实现真实的处理进度计算
                dto.setProcessingProgress(java.math.BigDecimal.valueOf(0.5));
            }
        }

        return dto;
    }
}