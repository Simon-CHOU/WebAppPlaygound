-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建索引优化查询性能
-- 这些将在Flyway迁移后执行

-- 性能优化设置
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- 重新加载配置
SELECT pg_reload_conf();

-- 创建索引
-- 这些将在应用启动后由JPA管理

-- 监控设置
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 设置时区
SET timezone = 'UTC';