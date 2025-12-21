package com.videoframecatcher.controller;

import com.videoframecatcher.dto.FrameDTO;
import com.videoframecatcher.dto.FrameUpdateRequest;
import com.videoframecatcher.service.FrameService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/frames")
@Tag(name = "Frame Management", description = "视频帧图像管理API")
public class FrameController {

    private final FrameService frameService;

    public FrameController(FrameService frameService) {
        this.frameService = frameService;
    }

    @GetMapping("/album/{albumId}")
    @Operation(summary = "获取相册的所有帧", description = "分页获取指定相册的所有帧图像")
    public ResponseEntity<Page<FrameDTO>> getFramesByAlbumId(
            @Parameter(description = "相册ID") @PathVariable Long albumId,
            @Parameter(description = "页码，从0开始") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "50") int size,
            @Parameter(description = "排序字段") @RequestParam(defaultValue = "timestamp") String sortBy,
            @Parameter(description = "排序方向") @RequestParam(defaultValue = "asc") String sortDir) {

        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ?
            Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<FrameDTO> frames = frameService.getFramesByAlbumId(albumId, pageable);
        return ResponseEntity.ok(frames);
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取帧详情", description = "根据ID获取指定帧的详细信息")
    public ResponseEntity<FrameDTO> getFrameById(
            @Parameter(description = "帧ID") @PathVariable Long id) {
        FrameDTO frame = frameService.getFrameById(id);
        return ResponseEntity.ok(frame);
    }

    @GetMapping("/{id}/image")
    @Operation(summary = "获取帧图像文件", description = "返回指定帧的图像文件")
    public ResponseEntity<Resource> getFrameImage(
            @Parameter(description = "帧ID") @PathVariable Long id,
            @Parameter(description = "是否返回缩略图") @RequestParam(defaultValue = "false") boolean thumbnail) {

        Resource imageResource = frameService.getFrameImage(id, thumbnail);
        if (imageResource == null) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (imageResource.getFilename() != null && imageResource.getFilename().toLowerCase().endsWith(".heic")) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM; // HEIC files
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + imageResource.getFilename() + "\"")
                .body(imageResource);
    }

    @GetMapping("/album/{albumId}/favorites")
    @Operation(summary = "获取相册的收藏帧", description = "获取指定相册中所有收藏的帧")
    public ResponseEntity<List<FrameDTO>> getFavoriteFrames(
            @Parameter(description = "相册ID") @PathVariable Long albumId) {
        List<FrameDTO> frames = frameService.getFavoriteFramesByAlbumId(albumId);
        return ResponseEntity.ok(frames);
    }

    @GetMapping("/favorites")
    @Operation(summary = "获取所有收藏帧", description = "获取所有相册中的收藏帧")
    public ResponseEntity<List<FrameDTO>> getAllFavoriteFrames() {
        List<FrameDTO> frames = frameService.getAllFavoriteFrames();
        return ResponseEntity.ok(frames);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新帧信息", description = "更新指定帧的信息（如收藏状态）")
    public ResponseEntity<FrameDTO> updateFrame(
            @Parameter(description = "帧ID") @PathVariable Long id,
            @Valid @RequestBody FrameUpdateRequest request) {
        FrameDTO frame = frameService.updateFrame(id, request);
        return ResponseEntity.ok(frame);
    }

    @PutMapping("/batch/favorite")
    @Operation(summary = "批量更新收藏状态", description = "批量设置多个帧的收藏状态")
    public ResponseEntity<Void> batchUpdateFavoriteStatus(
            @Parameter(description = "帧ID列表") @RequestParam List<Long> frameIds,
            @Parameter(description = "收藏状态") @RequestParam boolean favorite) {

        frameService.batchUpdateFavoriteStatus(frameIds, favorite);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/album/{albumId}/range")
    @Operation(summary = "获取时间范围内的帧", description = "获取指定相册在时间范围内的帧")
    public ResponseEntity<List<FrameDTO>> getFramesByTimeRange(
            @Parameter(description = "相册ID") @PathVariable Long albumId,
            @Parameter(description = "开始时间（秒）") @RequestParam Double startTime,
            @Parameter(description = "结束时间（秒）") @RequestParam Double endTime) {

        List<FrameDTO> frames = frameService.getFramesByTimeRange(albumId, startTime, endTime);
        return ResponseEntity.ok(frames);
    }

    @GetMapping("/album/{albumId}/top-quality")
    @Operation(summary = "获取高质量帧", description = "获取相册中质量最高的帧")
    public ResponseEntity<List<FrameDTO>> getTopQualityFrames(
            @Parameter(description = "相册ID") @PathVariable Long albumId,
            @Parameter(description = "返回数量") @RequestParam(defaultValue = "10") int limit) {

        List<FrameDTO> frames = frameService.getTopQualityFrames(albumId, limit);
        return ResponseEntity.ok(frames);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除帧", description = "删除指定的帧图像")
    public ResponseEntity<Void> deleteFrame(
            @Parameter(description = "帧ID") @PathVariable Long id) {
        frameService.deleteFrame(id);
        return ResponseEntity.noContent().build();
    }
}