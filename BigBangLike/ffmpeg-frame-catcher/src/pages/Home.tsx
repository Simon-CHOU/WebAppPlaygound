import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';

import { getApiUrl } from '../lib/config';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File, dataSource: 'supabase' | 'local') => {
    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataSource', dataSource);
      
      // 模拟上传进度
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      const response = await fetch(getApiUrl('/upload'), {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(uploadInterval);
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      const data = await response.json();
      setTaskId(data.taskId);
      setUploadProgress(100);
      setProcessingStatus('pending');
      setProcessingProgress(0); // 显式重置处理进度
      
      // 延迟关闭上传状态，直到第一次获取到处理进度或 1.5s 后
      // 这样可以避免上传条消失后，处理条因为还没拿到第一次轮询结果而显示 0% 的跳动感
      setTimeout(() => {
        setIsUploading(false);
      }, 1000);
      
      // 开始轮询处理进度
      pollProgress(data.taskId, dataSource);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const pollProgress = async (taskId: string, dataSource: 'supabase' | 'local') => {
    let isPolling = true;
    
    const checkProgress = async () => {
      if (!isPolling) return;
      
      try {
        const response = await fetch(getApiUrl(`/progress/${taskId}?dataSource=${dataSource}`));
        
        if (!response.ok) {
          throw new Error('获取进度失败');
        }
        
        const data = await response.json();
        
        // 只有当获取到的进度不小于当前显示的进度时才更新，防止进度回跳
        setProcessingProgress(prev => Math.max(prev, data.progress));
        setProcessingStatus(data.status);
        
        if (data.status === 'completed') {
          isPolling = false;
          // 处理完成，跳转到相册页面
          setTimeout(() => {
            navigate(`/album/${taskId}?dataSource=${dataSource}`);
          }, 1000);
          return;
        }
        
        if (data.status === 'failed') {
          isPolling = false;
          setError('处理失败，请重试');
          return;
        }
        
        // 只有在当前请求完成后才安排下一次请求，防止并发请求导致的进度回跳
        setTimeout(checkProgress, 1000);
        
      } catch (err) {
        console.error('Progress check error:', err);
        // 出错时也等待后再试
        setTimeout(checkProgress, 2000);
      }
    };
    
    checkProgress();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MP4转HEIC相册
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            拖拽上传MP4视频，我们将提取每一帧并转换为HEIC格式，生成精美的相册展示
          </p>
        </div>

        {/* 特性介绍 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">硬件加速</h3>
            <p className="text-gray-600">利用Intel Arc A380硬件加速，处理速度提升3-8倍</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💾</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">节省存储</h3>
            <p className="text-gray-600">HEIC格式比PNG节省70-85%存储空间</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">照片流</h3>
            <p className="text-gray-600">Google Photos式的照片流展示体验</p>
          </div>
        </div>

        {/* 上传区域 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">
            开始转换您的视频
          </h2>
          
          <FileUpload
            onUpload={handleFileUpload}
            onProgress={(progress) => console.log('Progress:', progress)}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
            processingStatus={processingStatus}
            processingProgress={processingProgress}
            error={error}
          />
        </div>

        {/* 使用说明 */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">支持的格式</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• MP4格式视频</li>
                <li>• 最大文件大小：2GB</li>
                <li>• 优先H264编码</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">输出特性</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• HEIC格式图片</li>
                <li>• 质量：80（平衡画质和大小）</li>
                <li>• 按帧序号自动排序</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;