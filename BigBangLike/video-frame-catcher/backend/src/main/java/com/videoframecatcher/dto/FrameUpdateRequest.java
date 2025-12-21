package com.videoframecatcher.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class FrameUpdateRequest {

    @NotNull(message = "收藏状态不能为空")
    private Boolean isFavorite;

    private BigDecimal qualityScore;

    // Getters and Setters
    public Boolean getIsFavorite() {
        return isFavorite;
    }

    public void setIsFavorite(Boolean isFavorite) {
        this.isFavorite = isFavorite;
    }

    public BigDecimal getQualityScore() {
        return qualityScore;
    }

    public void setQualityScore(BigDecimal qualityScore) {
        this.qualityScore = qualityScore;
    }
}