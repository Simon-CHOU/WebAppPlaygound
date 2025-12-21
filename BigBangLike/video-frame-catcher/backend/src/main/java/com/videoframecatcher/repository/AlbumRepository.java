package com.videoframecatcher.repository;

import com.videoframecatcher.entity.Album;
import com.videoframecatcher.entity.AlbumStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlbumRepository extends JpaRepository<Album, Long> {

    /**
     * 根据状态查找相册
     */
    List<Album> findByStatus(AlbumStatus status);

    /**
     * 根据名称查找相册（支持模糊查询）
     */
    @Query("SELECT a FROM Album a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Album> findByNameContainingIgnoreCase(@Param("name") String name, Pageable pageable);

    /**
     * 根据原始文件名查找相册
     */
    Optional<Album> findByOriginalFilename(String originalFilename);

    /**
     * 查找指定时间之后创建的相册
     */
    @Query("SELECT a FROM Album a WHERE a.createdAt >= :since")
    List<Album> findByCreatedAtAfter(@Param("since") LocalDateTime since);

    /**
     * 统计指定状态的相册数量
     */
    @Query("SELECT COUNT(a) FROM Album a WHERE a.status = :status")
    long countByStatus(@Param("status") AlbumStatus status);

    /**
     * 更新相册状态
     */
    @Modifying
    @Query("UPDATE Album a SET a.status = :status, a.updatedAt = CURRENT_TIMESTAMP WHERE a.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") AlbumStatus status);

    /**
     * 查找处理失败超过指定时间的相册
     */
    @Query("SELECT a FROM Album a WHERE a.status = 'FAILED' AND a.updatedAt < :threshold")
    List<Album> findFailedAlbumsOlderThan(@Param("threshold") LocalDateTime threshold);

    /**
     * 查找正在处理的相册数量
     */
    @Query("SELECT COUNT(a) FROM Album a WHERE a.status = 'PROCESSING'")
    long countProcessingAlbums();

    /**
     * 获取相册统计信息
     */
    @Query("SELECT a.status, COUNT(a) FROM Album a GROUP BY a.status")
    List<Object[]> getAlbumStatistics();
}