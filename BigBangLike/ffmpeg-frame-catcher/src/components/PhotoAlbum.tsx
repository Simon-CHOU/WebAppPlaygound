import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Download, Calendar, Image, CheckSquare, Square, Clock } from 'lucide-react';

import { getApiUrl } from '../lib/config';

interface ImageData {
  id: string;
  frameNumber: number;
  filename: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  timestamp?: string; // 视频中的时间戳 HH:mm:ss.SSS
}

interface AlbumData {
  albumId: string;
  name: string;
  totalFrames: number;
  resolution: string;
  fps: number;
  createdAt: string;
  images: ImageData[];
}

const PhotoAlbum: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [visibleImages, setVisibleImages] = useState(20);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [namingMode, setNamingMode] = useState<'frame' | 'timestamp'>('frame');
  
  // 从 URL 参数获取 dataSource
  const queryParams = new URLSearchParams(window.location.search);
  const dataSource = queryParams.get('dataSource') || 'supabase';

  useEffect(() => {
    fetchAlbumData();
  }, [albumId]);

  const fetchAlbumData = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/album/${albumId}?dataSource=${dataSource}`));
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('相册不存在');
        }
        throw new Error('加载失败');
      }
      
      const data = await response.json();
      
      // 为每张图片计算时间戳
      const imagesWithTimestamp = data.images.map((img: any) => {
        const fps = data.fps || 30; // 默认30fps
        const totalMs = (img.frameNumber / fps) * 1000;
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const ms = Math.floor(totalMs % 1000);
        
        const timestamp = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
        
        return { ...img, timestamp };
      });
      
      setAlbum({ ...data, images: imagesWithTimestamp });
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
    
    // 如果路径已经包含 /api/albums，直接返回
    if (finalPath.startsWith('/api/albums')) return finalPath;

    // 如果路径不包含 albums 前缀（例如相对路径），手动拼接
    // 确保 pathWithPrefix 不以 / 开头
    let pathWithPrefix = finalPath;
    if (!finalPath.startsWith('albums/') && !finalPath.startsWith('/albums/')) {
      pathWithPrefix = `albums/${finalPath.startsWith('/') ? finalPath.slice(1) : finalPath}`;
    } else if (finalPath.startsWith('/')) {
      pathWithPrefix = finalPath.slice(1);
    }

    // 使用 getApiUrl 获取完整路径
    return getApiUrl(`/${pathWithPrefix}`);
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

  const toggleImageSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImageIds(newSelected);
  };

  const selectAll = () => {
    if (!album) return;
    if (selectedImageIds.size === album.images.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(album.images.map(img => img.id)));
    }
  };

  const downloadSingle = async (image: ImageData) => {
    try {
      const url = getImageUrl(image.filePath, false);
      const response = await fetch(url);
      const blob = await response.blob();
      
      let downloadName = '';
      if (namingMode === 'frame') {
        downloadName = `frame_${image.frameNumber}_of_${album?.totalFrames}.heic`;
      } else {
        // 将时间戳中的 : 和 . 替换为下划线或连字符，避免文件名非法
        const safeTimestamp = image.timestamp?.replace(/[:.]/g, '-') || `frame_${image.frameNumber}`;
        downloadName = `${safeTimestamp}.heic`;
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败');
    }
  };

  const downloadBatch = async () => {
    if (selectedImageIds.size === 0) return;
    
    const selectedImages = album?.images.filter(img => selectedImageIds.has(img.id)) || [];
    
    // 由于浏览器安全限制，批量下载通常需要打包成 ZIP 或循环触发下载
    // 这里采用循环触发方式，对于少量图片比较方便
    for (const image of selectedImages) {
      await downloadSingle(image);
      // 稍微延迟一下，防止浏览器拦截多个弹出窗口
      await newSetTimeout(500);
    }
  };

  // 模拟 SetTimeout 的 Promise 版本
  const newSetTimeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{album.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                <div className="flex items-center">
                  <Image className="w-3.5 h-3.5 mr-1" />
                  <span>总帧数: {album.totalFrames}</span>
                </div>
                <div className="flex items-center">
                  <span>分辨率: {album.resolution}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  <span>{formatDate(album.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 命名模式选择 */}
              <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setNamingMode('frame')}
                  title="文件名格式：帧号_总帧数.heic (例如: frame_0045_of_1000.heic)"
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    namingMode === 'frame' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  帧号命名
                </button>
                <button
                  onClick={() => setNamingMode('timestamp')}
                  title="文件名格式：HH-mm-ss-SSS.heic (例如: 00-01-23-450.heic)"
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    namingMode === 'timestamp' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  时间戳命名
                </button>
              </div>

              <div className="h-8 w-px bg-gray-200 mx-1"></div>

              {selectedImageIds.size > 0 ? (
                <button
                  onClick={downloadBatch}
                  className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  批量下载 ({selectedImageIds.size})
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (album) {
                      setSelectedImageIds(new Set(album.images.map(img => img.id)));
                      // 这里的 setSelectedImageIds 是异步的，不能直接调用 downloadBatch
                      // 我们直接下载所有
                      const allImages = album.images;
                      const downloadAll = async () => {
                        for (const image of allImages) {
                          await downloadSingle(image);
                          await newSetTimeout(500);
                        }
                      };
                      downloadAll();
                    }
                  }}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载全额相册
                </button>
              )}
              
              <button
                onClick={selectAll}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                {selectedImageIds.size === album.images.length ? (
                  <CheckSquare className="w-4 h-4 mr-2 text-blue-500" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                全选
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 图片网格 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          onScroll={handleScroll}
          style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}
        >
          {album.images.slice(0, visibleImages).map((image, index) => (
            <div
              key={image.id}
              className={`
                group relative bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer 
                transition-all duration-200 border-2
                ${selectedImageIds.has(image.id) ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-transparent hover:shadow-md'}
              `}
              onClick={() => handleImageClick(index)}
            >
              {/* 复选框覆盖层 */}
              <div 
                className={`
                  absolute top-2 left-2 z-10 p-1 rounded-md transition-all
                  ${selectedImageIds.has(image.id) ? 'bg-blue-500 text-white' : 'bg-black bg-opacity-20 text-white opacity-0 group-hover:opacity-100 hover:bg-opacity-40'}
                `}
                onClick={(e) => toggleImageSelection(image.id, e)}
              >
                {selectedImageIds.has(image.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </div>

              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                <img
                  src={getImageUrl(image.filePath, true)}
                  alt={`帧 #${image.frameNumber}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('_thumb.jpg')) {
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
                
                {/* 时间戳悬浮层 */}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  {image.timestamp}
                </div>
              </div>
              <div className="p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-semibold text-gray-900">帧 #{image.frameNumber}</p>
                  <p className="text-[10px] text-gray-400">#{index + 1}</p>
                </div>
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
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 md:p-8"
          onClick={handleClosePreview}
        >
          <div 
            className="relative flex flex-col w-fit mx-auto min-w-[320px] sm:min-w-[520px] max-w-full md:max-w-[85vw] max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 - 移到右上角外面或悬浮在右上角 */}
            <button
              onClick={handleClosePreview}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors z-10"
              title="关闭"
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* 导航按钮 - 使用更现代的悬浮样式 */}
            {selectedImageIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                className="absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-sm hidden md:block z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
            
            {selectedImageIndex < album.images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-sm hidden md:block z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
            
            {/* 图片主体 - 确保与下方 Toolbar 宽度一致 */}
            <div className="relative bg-transparent rounded-lg overflow-hidden shadow-2xl w-full flex justify-center">
              <img
                src={getImageUrl(album.images[selectedImageIndex].filePath, false)}
                alt={`帧 #${album.images[selectedImageIndex].frameNumber}`}
                className="block w-full h-auto max-h-[70vh] object-contain select-none"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('_thumb.jpg')) {
                    target.src = getImageUrl(album.images[selectedImageIndex].filePath, true);
                  } else {
                    target.style.display = 'none';
                    target.parentElement?.querySelector('.error-placeholder')?.classList.remove('hidden');
                  }
                }}
              />
              
              {/* 错误占位符 */}
              <div className="error-placeholder hidden w-full p-12 text-center bg-gray-900 rounded-lg">
                <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">无法加载图片</p>
              </div>

              {/* 移动端导航点击区域 */}
              <div className="absolute inset-y-0 left-0 w-1/4 md:hidden" onClick={handlePrevious}></div>
              <div className="absolute inset-y-0 right-0 w-1/4 md:hidden" onClick={handleNext}></div>
            </div>
            
            {/* 底部信息栏 - 宽度自动铺满容器，与图片对齐 */}
            <div className="mt-4 bg-white rounded-xl p-4 shadow-xl w-full">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="bg-blue-50 p-2.5 rounded-lg">
                    <div className="text-blue-600 font-bold text-base leading-none mb-1">
                      帧 #{album.images[selectedImageIndex].frameNumber}
                    </div>
                    <div className="flex items-center text-[11px] text-blue-500 font-medium">
                      <Clock className="w-3 h-3 mr-1" />
                      {album.images[selectedImageIndex].timestamp}
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>
                  
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">文件大小</span>
                    <span className="text-sm text-gray-700 font-semibold">{formatFileSize(album.images[selectedImageIndex].fileSize)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-bold">
                    {selectedImageIndex + 1} / {album.images.length}
                  </div>
                  
                  <button
                    onClick={() => downloadSingle(album.images[selectedImageIndex!])}
                    className="flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载当前帧
                  </button>
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