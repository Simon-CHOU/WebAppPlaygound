package com.videoframecatcher.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public class AlbumCreateRequest {

    @NotNull(message = "视频文件不能为空")
    private MultipartFile videoFile;

    @NotBlank(message = "相册名称不能为空")
    @Size(max = 255, message = "相册名称长度不能超过255个字符")
    private String name;

    // Getters and Setters
    public MultipartFile getVideoFile() {
        return videoFile;
    }

    public void setVideoFile(MultipartFile videoFile) {
        this.videoFile = videoFile;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}