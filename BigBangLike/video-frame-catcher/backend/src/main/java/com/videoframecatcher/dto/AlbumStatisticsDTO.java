package com.videoframecatcher.dto;

import java.util.Map;

public class AlbumStatisticsDTO {

    private long totalAlbums;
    private long processingAlbums;
    private long completedAlbums;
    private long failedAlbums;
    private long totalFrames;
    private long totalFavoriteFrames;
    private long totalStorageUsed;
    private Map<String, Long> albumsByStatus;

    // Constructors
    public AlbumStatisticsDTO() {}

    public AlbumStatisticsDTO(long totalAlbums, long processingAlbums, long completedAlbums,
                             long failedAlbums, long totalFrames, long totalFavoriteFrames,
                             long totalStorageUsed, Map<String, Long> albumsByStatus) {
        this.totalAlbums = totalAlbums;
        this.processingAlbums = processingAlbums;
        this.completedAlbums = completedAlbums;
        this.failedAlbums = failedAlbums;
        this.totalFrames = totalFrames;
        this.totalFavoriteFrames = totalFavoriteFrames;
        this.totalStorageUsed = totalStorageUsed;
        this.albumsByStatus = albumsByStatus;
    }

    // Getters and Setters
    public long getTotalAlbums() {
        return totalAlbums;
    }

    public void setTotalAlbums(long totalAlbums) {
        this.totalAlbums = totalAlbums;
    }

    public long getProcessingAlbums() {
        return processingAlbums;
    }

    public void setProcessingAlbums(long processingAlbums) {
        this.processingAlbums = processingAlbums;
    }

    public long getCompletedAlbums() {
        return completedAlbums;
    }

    public void setCompletedAlbums(long completedAlbums) {
        this.completedAlbums = completedAlbums;
    }

    public long getFailedAlbums() {
        return failedAlbums;
    }

    public void setFailedAlbums(long failedAlbums) {
        this.failedAlbums = failedAlbums;
    }

    public long getTotalFrames() {
        return totalFrames;
    }

    public void setTotalFrames(long totalFrames) {
        this.totalFrames = totalFrames;
    }

    public long getTotalFavoriteFrames() {
        return totalFavoriteFrames;
    }

    public void setTotalFavoriteFrames(long totalFavoriteFrames) {
        this.totalFavoriteFrames = totalFavoriteFrames;
    }

    public long getTotalStorageUsed() {
        return totalStorageUsed;
    }

    public void setTotalStorageUsed(long totalStorageUsed) {
        this.totalStorageUsed = totalStorageUsed;
    }

    public Map<String, Long> getAlbumsByStatus() {
        return albumsByStatus;
    }

    public void setAlbumsByStatus(Map<String, Long> albumsByStatus) {
        this.albumsByStatus = albumsByStatus;
    }
}