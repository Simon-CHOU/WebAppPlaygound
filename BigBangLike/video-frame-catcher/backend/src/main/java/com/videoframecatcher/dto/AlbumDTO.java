package com.videoframecatcher.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.videoframecatcher.entity.AlbumStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AlbumDTO {

    private Long id;
    private String name;
    private String originalFilename;
    private String videoPath;
    private Long fileSize;
    private BigDecimal duration;
    private Integer frameRate;
    private Integer width;
    private Integer height;
    private String videoCodec;
    private String storageType;
    private String storagePath;
    private AlbumStatus status;
    private Long frameCount;
    private Long favoriteCount;
    private Long totalFrameSize;
    private BigDecimal processingProgress;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    // Constructors
    public AlbumDTO() {}

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getVideoPath() {
        return videoPath;
    }

    public void setVideoPath(String videoPath) {
        this.videoPath = videoPath;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public BigDecimal getDuration() {
        return duration;
    }

    public void setDuration(BigDecimal duration) {
        this.duration = duration;
    }

    public Integer getFrameRate() {
        return frameRate;
    }

    public void setFrameRate(Integer frameRate) {
        this.frameRate = frameRate;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public String getVideoCodec() {
        return videoCodec;
    }

    public void setVideoCodec(String videoCodec) {
        this.videoCodec = videoCodec;
    }

    public String getStorageType() {
        return storageType;
    }

    public void setStorageType(String storageType) {
        this.storageType = storageType;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public AlbumStatus getStatus() {
        return status;
    }

    public void setStatus(AlbumStatus status) {
        this.status = status;
    }

    public Long getFrameCount() {
        return frameCount;
    }

    public void setFrameCount(Long frameCount) {
        this.frameCount = frameCount;
    }

    public Long getFavoriteCount() {
        return favoriteCount;
    }

    public void setFavoriteCount(Long favoriteCount) {
        this.favoriteCount = favoriteCount;
    }

    public Long getTotalFrameSize() {
        return totalFrameSize;
    }

    public void setTotalFrameSize(Long totalFrameSize) {
        this.totalFrameSize = totalFrameSize;
    }

    public BigDecimal getProcessingProgress() {
        return processingProgress;
    }

    public void setProcessingProgress(BigDecimal processingProgress) {
        this.processingProgress = processingProgress;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}