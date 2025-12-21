-- 创建相册表
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

-- 创建帧表
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

-- 创建帧标签表（为未来功能扩展）
CREATE TABLE frame_tags (
    id BIGSERIAL PRIMARY KEY,
    album_id BIGINT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    frame_id BIGINT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto', 'ai'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
-- 相册表索引
CREATE INDEX idx_albums_created_at ON albums(created_at);
CREATE INDEX idx_albums_status ON albums(status);
CREATE INDEX idx_albums_name ON albums(name);

-- 帧表索引
CREATE INDEX idx_frames_album_id ON frames(album_id);
CREATE INDEX idx_frames_timestamp ON frames(timestamp);
CREATE INDEX idx_frames_is_favorite ON frames(is_favorite);
CREATE INDEX idx_frames_frame_number ON frames(frame_number);
CREATE UNIQUE INDEX idx_frames_album_frame ON frames(album_id, frame_number);

-- 帧标签表索引
CREATE INDEX idx_frame_tags_frame_id ON frame_tags(frame_id);
CREATE INDEX idx_frame_tags_tag_name ON frame_tags(tag_name);
CREATE INDEX idx_frame_tags_album_id ON frame_tags(album_id);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相册表创建更新时间戳触发器
CREATE TRIGGER update_albums_updated_at
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为帧表创建更新时间戳触发器
CREATE TRIGGER update_frames_updated_at
    BEFORE UPDATE ON frames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为帧标签表创建更新时间戳触发器
CREATE TRIGGER update_frame_tags_updated_at
    BEFORE UPDATE ON frame_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();