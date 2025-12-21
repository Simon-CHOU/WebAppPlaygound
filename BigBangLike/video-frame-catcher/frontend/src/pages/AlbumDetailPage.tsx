import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Space,
  Typography,
  Spin,
  Empty,
  Pagination,
  Image,
  Checkbox,
  message,
  Breadcrumb
} from 'antd';
import {
  HomeOutlined,
  VideoCameraOutlined,
  HeartOutlined,
  HeartFilled,
  EyeOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  SelectOutlined
} from '@ant-design/icons';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { useAlbumStore } from '../stores/albumStore';
import { useFrameStore } from '../stores/frameStore';
import { Album, AlbumStatus } from '../types/album';
import { Frame } from '../types/frame';
import { formatFileSize, formatTimestamp, formatRelativeTime } from '../utils/format';
import 'react-photo-view/dist/react-photo-view.css';

const { Title, Text, Statistic } = Typography;

const AlbumDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentAlbum,
    loading: albumLoading,
    fetchAlbum,
    retryProcessing
  } = useAlbumStore();

  const {
    frames,
    loading: framesLoading,
    pagination,
    fetchFramesByAlbum,
    updateFrame,
    batchUpdateFavoriteStatus
  } = useFrameStore();

  const [selectedFrameIds, setSelectedFrameIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (id) {
      fetchAlbum(Number(id));
      fetchFramesByAlbum(Number(id), { page: 0, size: 50 });
    }
  }, [id, fetchAlbum, fetchFramesByAlbum]);

  const handleFrameFavoriteToggle = async (frameId: number, isFavorite: boolean) => {
    try {
      await updateFrame(frameId, { isFavorite });
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleBatchFavorite = (favorite: boolean) => {
    if (selectedFrameIds.length === 0) {
      message.warning('请先选择要操作的帧');
      return;
    }

    batchUpdateFavoriteStatus(selectedFrameIds, favorite);
    setSelectedFrameIds([]);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setCurrentPage(page - 1);
    fetchFramesByAlbum(Number(id), { page: page - 1, size: pageSize });
  };

  const handleFrameSelect = (frameId: number, selected: boolean) => {
    setSelectedFrameIds(prev =>
      selected
        ? [...prev, frameId]
        : prev.filter(id => id !== frameId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFrameIds(frames.map((frame: Frame) => frame.id));
    } else {
      setSelectedFrameIds([]);
    }
  };

  if (albumLoading || !currentAlbum) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Button
            type="link"
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
          >
            相册列表
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{currentAlbum.name}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 相册信息 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col>
            <div style={{
              width: 120,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: 8
            }}>
              <VideoCameraOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            </div>
          </Col>
          <Col flex="auto">
            <Title level={3} style={{ margin: '0 0 8px 0' }}>
              {currentAlbum.name}
            </Title>
            <Space size="large" wrap>
              <Text type="secondary">{currentAlbum.originalFilename}</Text>
              <Text type="secondary">
                {formatFileSize(currentAlbum.fileSize)}
              </Text>
              <Text type="secondary">
                {currentAlbum.frameRate} FPS
              </Text>
              <Text type="secondary">
                {currentAlbum.width} × {currentAlbum.height}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tag color={currentAlbum.status === AlbumStatus.COMPLETED ? 'green' :
                          currentAlbum.status === AlbumStatus.PROCESSING ? 'blue' : 'red'}>
                {currentAlbum.status === AlbumStatus.COMPLETED ? '已完成' :
                 currentAlbum.status === AlbumStatus.PROCESSING ? '处理中' : '处理失败'}
              </Tag>
              {currentAlbum.status === AlbumStatus.FAILED && (
                <Button
                  size="small"
                  onClick={() => retryProcessing(currentAlbum.id)}
                  loading={albumLoading}
                >
                  重试处理
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={6}>
            <Statistic title="总帧数" value={currentAlbum.frameCount || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="收藏帧数" value={currentAlbum.favoriteCount || 0} />
          </Col>
          <Col span={6}>
            <Statistic
              title="存储大小"
              value={formatFileSize(currentAlbum.totalFrameSize || 0)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="创建时间"
              value={formatRelativeTime(currentAlbum.createdAt)}
            />
          </Col>
        </Row>
      </Card>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Checkbox
                indeterminate={selectedFrameIds.length > 0 && selectedFrameIds.length < frames.length}
                checked={selectedFrameIds.length === frames.length && frames.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                全选
              </Checkbox>
              {selectedFrameIds.length > 0 && (
                <>
                  <Text>已选择 {selectedFrameIds.length} 项</Text>
                  <Button
                    type="primary"
                    icon={<HeartFilled />}
                    size="small"
                    onClick={() => handleBatchFavorite(true)}
                  >
                    批量收藏
                  </Button>
                  <Button
                    icon={<HeartOutlined />}
                    size="small"
                    onClick={() => handleBatchFavorite(false)}
                  >
                    取消收藏
                  </Button>
                </>
              )}
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchFramesByAlbum(Number(id), { page: currentPage, size: 50 })}
              loading={framesLoading}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 帧图像列表 */}
      {framesLoading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : frames.length === 0 ? (
        <Empty
          description="暂无帧图像"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <PhotoProvider>
            <Row gutter={[16, 16]}>
              {frames.map((frame: Frame) => (
                <Col xs={24} sm={12} md={8} lg={6} xl={4} key={frame.id}>
                  <Card
                    hoverable
                    cover={
                      <div style={{ position: 'relative' }}>
                        <PhotoView src={frame.imageUrl || ''}>
                          <Image
                            src={frame.thumbnailUrl || frame.imageUrl}
                            alt={frame.filename}
                            preview={false}
                            style={{
                              width: '100%',
                              height: 150,
                              objectFit: 'cover',
                              cursor: 'pointer'
                            }}
                            fallback="/images/image-placeholder.png"
                          />
                        </PhotoView>

                        {/* 选择框 */}
                        <Checkbox
                          style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: 4
                          }}
                          checked={selectedFrameIds.includes(frame.id)}
                          onChange={(e) => handleFrameSelect(frame.id, e.target.checked)}
                        />

                        {/* 收藏按钮 */}
                        <Button
                          type="text"
                          icon={frame.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: 4
                          }}
                          onClick={() => handleFrameFavoriteToggle(frame.id, !frame.isFavorite)}
                        />

                        {/* 时间戳 */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: '12px'
                          }}
                        >
                          {formatTimestamp(frame.timestamp)}
                        </div>
                      </div>
                    }
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis style={{ fontSize: '12px' }}>
                          帧 #{frame.frameNumber.toString().padStart(6, '0')}
                        </Text>
                      }
                      description={
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {frame.width} × {frame.height} • {formatFileSize(frame.fileSize)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {formatRelativeTime(frame.createdAt)}
                          </Text>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </PhotoProvider>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Pagination
                current={currentPage + 1}
                total={pagination.total}
                pageSize={pagination.size}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AlbumDetailPage;