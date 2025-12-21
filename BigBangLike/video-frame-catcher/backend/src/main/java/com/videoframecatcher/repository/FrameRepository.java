package com.videoframecatcher.repository;

import com.videoframecatcher.entity.Frame;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface FrameRepository extends JpaRepository<Frame, Long> {

    /**
     * 根据相册ID查找所有帧
     */
    List<Frame> findByAlbumId(Long albumId);

    /**
     * 根据相册ID分页查找帧
     */
    Page<Frame> findByAlbumId(Long albumId, Pageable pageable);

    /**
     * 根据相册ID和帧号查找帧
     */
    Optional<Frame> findByAlbumIdAndFrameNumber(Long albumId, Integer frameNumber);

    /**
     * 查找收藏的帧
     */
    List<Frame> findByIsFavoriteTrue();

    /**
     * 根据相册ID查找收藏的帧
     */
    List<Frame> findByAlbumIdAndIsFavoriteTrue(Long albumId);

    /**
     * 根据时间戳范围查找帧
     */
    @Query("SELECT f FROM Frame f WHERE f.album.id = :albumId AND f.timestamp BETWEEN :start AND :end ORDER BY f.timestamp")
    List<Frame> findByAlbumIdAndTimestampRange(@Param("albumId") Long albumId,
                                               @Param("start") BigDecimal start,
                                               @Param("end") BigDecimal end);

    /**
     * 获取相册中质量最高的前N帧
     */
    @Query("SELECT f FROM Frame f WHERE f.album.id = :albumId AND f.qualityScore IS NOT NULL ORDER BY f.qualityScore DESC")
    List<Frame> findTopQualityFramesByAlbumId(@Param("albumId") Long albumId, Pageable pageable);

    /**
     * 统计相册中的帧数量
     */
    @Query("SELECT COUNT(f) FROM Frame f WHERE f.album.id = :albumId")
    long countByAlbumId(@Param("albumId") Long albumId);

    /**
     * 统计相册中收藏的帧数量
     */
    @Query("SELECT COUNT(f) FROM Frame f WHERE f.album.id = :albumId AND f.isFavorite = true")
    long countFavoriteFramesByAlbumId(@Param("albumId") Long albumId);

    /**
     * 获取相册中帧文件的总大小
     */
    @Query("SELECT COALESCE(SUM(f.fileSize), 0) FROM Frame f WHERE f.album.id = :albumId")
    long getTotalFileSizeByAlbumId(@Param("albumId") Long albumId);

    /**
     * 批量更新收藏状态
     */
    @Modifying
    @Query("UPDATE Frame f SET f.isFavorite = :favorite, f.updatedAt = CURRENT_TIMESTAMP WHERE f.id IN :frameIds")
    int batchUpdateFavoriteStatus(@Param("frameIds") List<Long> frameIds, @Param("favorite") boolean favorite);

    /**
     * 根据文件路径查找帧
     */
    Optional<Frame> findByFilePath(String filePath);

    /**
     * 删除相册的所有帧
     */
    @Modifying
    @Query("DELETE FROM Frame f WHERE f.album.id = :albumId")
    int deleteByAlbumId(@Param("albumId") Long albumId);

    /**
     * 获取帧的统计信息
     */
    @Query("SELECT f.album.id, COUNT(f), SUM(f.fileSize), COUNT(CASE WHEN f.isFavorite = true THEN 1 END) FROM Frame f GROUP BY f.album.id")
    List<Object[]> getFrameStatisticsByAlbum();

    /**
     * 查找没有缩略图的帧
     */
    @Query("SELECT f FROM Frame f WHERE f.album.id = :albumId AND (f.thumbnailPath IS NULL OR f.thumbnailPath = '')")
    List<Frame> findFramesWithoutThumbnail(@Param("albumId") Long albumId);

    /**
     * 根据格式查找帧
     */
    List<Frame> findByAlbumIdAndFormat(Long albumId, String format);
}