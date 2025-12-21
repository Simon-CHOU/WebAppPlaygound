import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Upload,
  Modal,
  Form,
  message,
  Tag,
  Space,
  Typography,
  Empty,
  Pagination,
  Spin
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAlbumStore } from '../stores/albumStore';
import { Album, AlbumStatus } from '../types/album';
import { formatFileSize, formatDuration, formatRelativeTime } from '../utils/format';

const { Title, Text, Meta } = Typography;
const { Option } = Select;
const { Search } = Input;

const AlbumListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    albums,
    loading,
    error,
    pagination,
    fetchAlbums,
    createAlbum,
    searchAlbums,
    deleteAlbum,
    retryProcessing,
    clearError
  } = useAlbumStore();

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleUpload = async (values: any) => {
    try {
      setUploading(true);
      await createAlbum({
        videoFile: values.videoFile.file,
        name: values.name
      });
      message.success('视频上传成功，正在处理中...');
      setUploadModalVisible(false);
      form.resetFields();
      fetchAlbums();
    } catch (error) {
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      searchAlbums(value.trim());
    } else {
      fetchAlbums();
    }
  };

  const handleRefresh = () => {
    fetchAlbums();
  };

  const handlePageChange = (page: number, pageSize: number) => {
    fetchAlbums({ page: page - 1, size: pageSize });
  };

  const getStatusTag = (status: AlbumStatus) => {
    switch (status) {
      case AlbumStatus.PROCESSING:
        return <Tag color="blue" icon={<ClockCircleOutlined />}>处理中</Tag>;
      case AlbumStatus.COMPLETED:
        return <Tag color="green" icon={<CheckCircleOutlined />}>已完成</Tag>;
      case AlbumStatus.FAILED:
        return <Tag color="red" icon={<ExclamationCircleOutlined />}>处理失败</Tag>;
      default:
        return <Tag>未知状态</Tag>;
    }
  };

  const getAlbumCardActions = (album: Album) => {
    const actions = [
      <Button
        type="link"
        onClick={() => navigate(`/albums/${album.id}`)}
      >
        查看详情
      </Button>
    ];

    if (album.status === AlbumStatus.FAILED) {
      actions.push(
        <Button
          type="link"
          onClick={() => retryProcessing(album.id)}
          loading={loading}
        >
          重试
        </Button>
      );
    }

    return actions;
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              视频相册
            </Title>
            <Text type="secondary">
              共 {pagination.total} 个相册
            </Text>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="搜索相册"
                onSearch={handleSearch}
                style={{ width: 200 }}
                enterButton={<SearchOutlined />}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setUploadModalVisible(true)}
              >
                上传视频
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 相册列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : albums.length === 0 ? (
        <Empty
          description="暂无相册"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            创建第一个相册
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {albums.map((album: Album) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={4} key={album.id}>
                <Card
                  hoverable
                  cover={
                    <div
                      style={{
                        height: 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        flexDirection: 'column'
                      }}
                    >
                      <VideoCameraOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                      <Text type="secondary" style={{ marginTop: 8 }}>
                        {album.originalFilename}
                      </Text>
                    </div>
                  }
                  actions={getAlbumCardActions(album)}
                >
                  <Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{album.name}</span>
                        {getStatusTag(album.status)}
                      </div>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary" ellipsis>
                          {album.originalFilename}
                        </Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">
                            {formatDuration(album.duration)}
                          </Text>
                          <Text type="secondary">
                            {album.frameCount || 0} 帧
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatRelativeTime(album.createdAt)}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Pagination
                current={pagination.page + 1}
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

      {/* 上传模态框 */}
      <Modal
        title="上传视频"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="name"
            label="相册名称"
            rules={[{ required: true, message: '请输入相册名称' }]}
          >
            <Input placeholder="请输入相册名称" />
          </Form.Item>

          <Form.Item
            name="videoFile"
            label="视频文件"
            valuePropName="file"
            getValueFromEvent={normFile}
            rules={[{ required: true, message: '请选择视频文件' }]}
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              accept=".mp4,.avi,.mov,.mkv"
            >
              <Button icon={<UploadOutlined />}>选择视频文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setUploadModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={uploading}>
                上传
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlbumListPage;