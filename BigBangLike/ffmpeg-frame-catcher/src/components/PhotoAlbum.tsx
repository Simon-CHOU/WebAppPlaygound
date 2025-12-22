import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Download, Calendar, Image } from 'lucide-react';

import { getApiUrl } from '../lib/config';

interface ImageData {
  id: string;
  frameNumber: number;
  filename: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

interface AlbumData {
  albumId: string;
  name: string;
  totalFrames: number;
  resolution: string;
  createdAt: string;
  images: ImageData[];
}

const PhotoAlbum: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [visibleImages, setVisibleImages] = useState(20); // 初始显示20张图片

  useEffect(() => {
    fetchAlbumData();
  }, [albumId]);

  const fetchAlbumData = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/album/${albumId}`));
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('相册不存在');
        }
        throw new Error('加载失败');
      }
      
      const data = await response.json();
      setAlbum(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path: string, isThumb: boolean = false) => {
    // 规范化路径：将 Windows 反斜杠转换为正斜杠
    const normalizedPath = path.replace(/\\/g, '/');
    // 如果是请求缩略图，替换扩展名
    const finalPath = isThumb ? normalizedPath.replace(/\.heic$/i, '_thumb.jpg') : normalizedPath;
    // 移除开头的 albums/ (如果存在，因为静态服务挂载在 /albums)
    // 数据库存的是 albums/taskId/file，所以直接用即可
    // 不需要 getApiUrl，因为我们在 vite.config.ts 中配置了 /albums 的代理
    // 如果是生产环境，可能需要完整的 URL，这里假设 /albums 也是根路径可访问
    return `/${finalPath.startsWith('/') ? finalPath.slice(1) : finalPath}`;
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleClosePreview = () => {
    setSelectedImageIndex(null);
  };

  const handlePrevious = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedImageIndex !== null && album && selectedImageIndex < album.images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // 当滚动到底部时加载更多图片
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setVisibleImages(prev => Math.min(prev + 20, album?.images.length || 0));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{error}</h2>
          <button 
            onClick={fetchAlbumData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!album) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部信息 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{album.name}</h1>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Image className="w-4 h-4 mr-1" />
                  <span>总帧数: {album.totalFrames}</span>
                </div>
                <div className="flex items-center">
                  <span>分辨率: {album.resolution}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{formatDate(album.createdAt)}</span>
                </div>
              </div>
            </div>
            <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              下载相册
            </button>
          </div>
        </div>
      </div>

      {/* 图片网格 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          onScroll={handleScroll}
          style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
        >
          {album.images.slice(0, visibleImages).map((image, index) => (
            <div
              key={image.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleImageClick(index)}
            >
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <img
                  src={getImageUrl(image.filePath, true)}
                  alt={`帧 #${image.frameNumber}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // 如果缩略图加载失败，尝试加载原图（虽然浏览器可能不支持HEIC，但如果是JPG/PNG则可以）
                    // 或者显示占位符
                    if (target.src.includes('_thumb.jpg')) {
                       // 尝试加载原图（可能是浏览器支持 HEIC 插件的情况）
                       target.src = getImageUrl(image.filePath, false);
                    } else {
                       target.style.display = 'none';
                       target.nextElementSibling?.classList.remove('hidden');
                    }
                  }}
                />
                <div className="hidden text-center p-4">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">帧 #{image.frameNumber}</p>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900">帧 #{image.frameNumber}</p>
                <p className="text-xs text-gray-500">{formatFileSize(image.fileSize)}</p>
              </div>
            </div>
          ))}
        </div>
        
        {visibleImages < album.images.length && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">加载更多图片...</p>
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {selectedImageIndex !== null && album && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={handleClosePreview}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
            >
              <X className="w-6 h-6" />
            </button>
            
            {selectedImageIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {selectedImageIndex < album.images.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            
            <div className="bg-white rounded-lg overflow-hidden">
              <img
                src={album.images[selectedImageIndex].filePath}
                alt={`帧 #${album.images[selectedImageIndex].frameNumber}`}
                className="max-w-full max-h-[80vh] object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden p-8 text-center">
                <Image className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">无法加载图片</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-b-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">帧 #{album.images[selectedImageIndex].frameNumber}</h3>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(album.images[selectedImageIndex].fileSize)}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedImageIndex + 1} / {album.images.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoAlbum;