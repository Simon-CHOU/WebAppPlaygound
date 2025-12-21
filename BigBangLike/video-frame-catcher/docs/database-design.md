# 数据库设计

## 实体关系图

```mermaid
erDiagram
    ALBUM ||--o{ FRAME : contains
    ALBUM ||--o{ FRAME_TAG : has
    FRAME ||--o{ FRAME_TAG : tagged_with

    ALBUM {
        bigint id PK
        string name
        string original_filename
        string video_path
        bigint file_size
        decimal duration
        integer frame_rate
        integer width
        integer height
        string video_codec
        timestamp created_at
        timestamp updated_at
        string status
    }

    FRAME {
        bigint id PK
        bigint album_id FK
        string filename
        string file_path
        decimal timestamp
        integer frame_number
        integer width
        integer height
        bigint file_size
        string format
        decimal quality_score
        boolean is_favorite
        timestamp created_at
        timestamp updated_at
    }

    FRAME_TAG {
        bigint id PK
        bigint album_id FK
        bigint frame_id FK
        string tag_name
        string tag_type
        timestamp created_at
    }
```

## 表结构定义

### albums 表
存储视频相册信息

```sql
CREATE TABLE albums (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    duration DECIMAL(10,3) NOT NULL,
    frame_rate INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    video_codec VARCHAR(50),
    storage_type VARCHAR(20) DEFAULT 'local',
    storage_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'processing' -- 'processing', 'completed', 'failed'
);

CREATE INDEX idx_albums_created_at ON albums(created_at);
CREATE INDEX idx_albums_status ON albums(status);
```

### frames 表
存储提取的帧图像信息

```sql
CREATE TABLE frames (
    id BIGSERIAL PRIMARY KEY,
    album_id BIGINT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    timestamp DECIMAL(10,3) NOT NULL,
    frame_number INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size BIGINT NOT NULL,
    format VARCHAR(10) DEFAULT 'heic',
    quality_score DECIMAL(3,2),
    is_favorite BOOLEAN DEFAULT FALSE,
    thumbnail_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_frames_album_id ON frames(album_id);
CREATE INDEX idx_frames_timestamp ON frames(timestamp);
CREATE INDEX idx_frames_is_favorite ON frames(is_favorite);
CREATE UNIQUE INDEX idx_frames_album_frame ON frames(album_id, frame_number);
```

### frame_tags 表
存储帧标签（为未来功能扩展）

```sql
CREATE TABLE frame_tags (
    id BIGSERIAL PRIMARY KEY,
    album_id BIGINT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    frame_id BIGINT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto', 'ai'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_frame_tags_frame_id ON frame_tags(frame_id);
CREATE INDEX idx_frame_tags_tag_name ON frame_tags(tag_name);
```

## 存储架构设计

### 本地存储结构
```
storage/
├── albums/
│   ├── {album_id}/
│   │   ├── video/
│   │   │   └── original.mp4
│   │   ├── frames/
│   │   │   ├── original/
│   │   │   │   ├── {filename}_000001.heic
│   │   │   │   ├── {filename}_000002.heic
│   │   │   │   └── ...
│   │   │   └── thumbnails/
│   │   │       ├── {filename}_000001_thumb.jpg
│   │   │       └── ...
│   │   └── metadata/
│   │       └── info.json
```

### 对象存储扩展设计
为未来支持OSS做准备，使用存储抽象层：

```java
public interface StorageService {
    String store(MultipartFile file, String path);
    InputStream load(String path);
    void delete(String path);
    String getUrl(String path);
}
```

支持实现：
- `LocalStorageService` - 当前实现
- `AliyunOssService` - 阿里云OSS
- `AwsS3Service` - AWS S3
- `AzureBlobService` - Azure Blob Storage