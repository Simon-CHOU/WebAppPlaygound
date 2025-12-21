package com.videoframecatcher.controller;

import com.videoframecatcher.dto.AlbumDTO;
import com.videoframecatcher.dto.AlbumCreateRequest;
import com.videoframecatcher.dto.AlbumStatisticsDTO;
import com.videoframecatcher.service.AlbumService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/albums")
@Tag(name = "Album Management", description = "视频相册管理API")
public class AlbumController {

    private final AlbumService albumService;

    public AlbumController(AlbumService albumService) {
        this.albumService = albumService;
    }

    @PostMapping
    @Operation(summary = "创建新相册", description = "上传视频文件并创建新的相册")
    public ResponseEntity<AlbumDTO> createAlbum(
            @Valid @ModelAttribute AlbumCreateRequest request) {
        AlbumDTO album = albumService.createAlbum(request);
        return ResponseEntity.ok(album);
    }

    @GetMapping
    @Operation(summary = "获取相册列表", description = "分页获取所有相册列表")
    public ResponseEntity<Page<AlbumDTO>> getAllAlbums(
            @Parameter(description = "页码，从0开始") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "排序字段") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "排序方向") @RequestParam(defaultValue = "desc") String sortDir) {

        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ?
            Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<AlbumDTO> albums = albumService.getAllAlbums(pageable);
        return ResponseEntity.ok(albums);
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取相册详情", description = "根据ID获取指定相册的详细信息")
    public ResponseEntity<AlbumDTO> getAlbumById(
            @Parameter(description = "相册ID") @PathVariable Long id) {
        AlbumDTO album = albumService.getAlbumById(id);
        return ResponseEntity.ok(album);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索相册", description = "根据名称搜索相册")
    public ResponseEntity<Page<AlbumDTO>> searchAlbums(
            @Parameter(description = "搜索关键词") @RequestParam String keyword,
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AlbumDTO> albums = albumService.searchAlbums(keyword, pageable);
        return ResponseEntity.ok(albums);
    }

    @GetMapping("/statistics")
    @Operation(summary = "获取相册统计信息", description = "获取相册的统计数据")
    public ResponseEntity<AlbumStatisticsDTO> getAlbumStatistics() {
        AlbumStatisticsDTO statistics = albumService.getAlbumStatistics();
        return ResponseEntity.ok(statistics);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除相册", description = "删除指定相册及其所有帧图像")
    public ResponseEntity<Void> deleteAlbum(
            @Parameter(description = "相册ID") @PathVariable Long id) {
        albumService.deleteAlbum(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/retry")
    @Operation(summary = "重试处理", description = "重新处理失败的相册")
    public ResponseEntity<AlbumDTO> retryProcessing(
            @Parameter(description = "相册ID") @PathVariable Long id) {
        AlbumDTO album = albumService.retryProcessing(id);
        return ResponseEntity.ok(album);
    }

    @GetMapping("/processing/count")
    @Operation(summary = "获取正在处理的相册数量", description = "返回当前正在处理的相册数量")
    public ResponseEntity<Long> getProcessingAlbumsCount() {
        long count = albumService.getProcessingAlbumsCount();
        return ResponseEntity.ok(count);
    }
}