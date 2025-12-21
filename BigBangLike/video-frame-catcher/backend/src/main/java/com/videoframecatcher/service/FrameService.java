package com.videoframecatcher.service;

import com.videoframecatcher.dto.FrameDTO;
import com.videoframecatcher.dto.FrameUpdateRequest;
import com.videoframecatcher.entity.Frame;
import com.videoframecatcher.repository.FrameRepository;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FrameService {

    private final FrameRepository frameRepository;
    private final StorageService storageService;

    public FrameService(FrameRepository frameRepository, StorageService storageService) {
        this.frameRepository = frameRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public Page<FrameDTO> getFramesByAlbumId(Long albumId, Pageable pageable) {
        Page<Frame> frames = frameRepository.findByAlbumId(albumId, pageable);
        return frames.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public FrameDTO getFrameById(Long id) {
        Frame frame = frameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Frame not found: " + id));
        return convertToDTO(frame);
    }

    public Resource getFrameImage(Long id, boolean thumbnail) {
        Frame frame = frameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Frame not found: " + id));

        String filePath = thumbnail && frame.getThumbnailPath() != null ?
                frame.getThumbnailPath() : frame.getFilePath();

        return storageService.loadFile(filePath);
    }

    @Transactional(readOnly = true)
    public List<FrameDTO> getFavoriteFramesByAlbumId(Long albumId) {
        List<Frame> frames = frameRepository.findByAlbumIdAndIsFavoriteTrue(albumId);
        return frames.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FrameDTO> getAllFavoriteFrames() {
        List<Frame> frames = frameRepository.findByIsFavoriteTrue();
        return frames.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public FrameDTO updateFrame(Long id, FrameUpdateRequest request) {
        Frame frame = frameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Frame not found: " + id));

        frame.setIsFavorite(request.getIsFavorite());
        if (request.getQualityScore() != null) {
            frame.setQualityScore(request.getQualityScore());
        }

        Frame savedFrame = frameRepository.save(frame);
        return convertToDTO(savedFrame);
    }

    public void batchUpdateFavoriteStatus(List<Long> frameIds, boolean favorite) {
        frameRepository.batchUpdateFavoriteStatus(frameIds, favorite);
    }

    @Transactional(readOnly = true)
    public List<FrameDTO> getFramesByTimeRange(Long albumId, Double startTime, Double endTime) {
        List<Frame> frames = frameRepository.findByAlbumIdAndTimestampRange(
                albumId, BigDecimal.valueOf(startTime), BigDecimal.valueOf(endTime));
        return frames.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FrameDTO> getTopQualityFrames(Long albumId, int limit) {
        Pageable pageable = Pageable.ofSize(limit);
        List<Frame> frames = frameRepository.findTopQualityFramesByAlbumId(albumId, pageable);
        return frames.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public void deleteFrame(Long id) {
        Frame frame = frameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Frame not found: " + id));

        // 删除文件存储
        storageService.deleteFile(frame.getFilePath());
        if (frame.getThumbnailPath() != null) {
            storageService.deleteFile(frame.getThumbnailPath());
        }

        // 删除数据库记录
        frameRepository.delete(frame);
    }

    private FrameDTO convertToDTO(Frame frame) {
        FrameDTO dto = new FrameDTO();
        dto.setId(frame.getId());
        dto.setAlbumId(frame.getAlbum().getId());
        dto.setFilename(frame.getFilename());
        dto.setFilePath(frame.getFilePath());
        dto.setTimestamp(frame.getTimestamp());
        dto.setFrameNumber(frame.getFrameNumber());
        dto.setWidth(frame.getWidth());
        dto.setHeight(frame.getHeight());
        dto.setFileSize(frame.getFileSize());
        dto.setFormat(frame.getFormat());
        dto.setQualityScore(frame.getQualityScore());
        dto.setIsFavorite(frame.getIsFavorite());
        dto.setThumbnailPath(frame.getThumbnailPath());
        dto.setCreatedAt(frame.getCreatedAt());
        dto.setUpdatedAt(frame.getUpdatedAt());

        // 生成URL
        // TODO: 根据实际部署环境配置基础URL
        dto.setImageUrl("/api/frames/" + frame.getId() + "/image");
        if (frame.getThumbnailPath() != null) {
            dto.setThumbnailUrl("/api/frames/" + frame.getId() + "/image?thumbnail=true");
        }

        return dto;
    }
}