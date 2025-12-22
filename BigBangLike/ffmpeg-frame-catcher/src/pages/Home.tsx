import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { Settings, Folder, Check, X } from 'lucide-react';
import { getApiUrl } from '../lib/config';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 下载路径设置
  const [downloadPath, setDownloadPath] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempPath, setTempPath] = useState<string>('');

  useEffect(() => {
    // 初始化时从 localStorage 读取或从后端获取默认路径
    const savedPath = localStorage.getItem('localDownloadPath');
    if (savedPath) {
      setDownloadPath(savedPath);
      setTempPath(savedPath);
    } else {
      fetchDefaultPath();
    }
  }, []);

  const fetchDefaultPath = async () => {
    try {
      const response = await fetch(getApiUrl('/download/default-path'));
      if (response.ok) {
        const data = await response.json();
        setDownloadPath(data.defaultPath);
        setTempPath(data.defaultPath);
        localStorage.setItem('localDownloadPath', data.defaultPath);
      }
    } catch (err) {
      console.error('Failed to fetch default path:', err);
    }
  };

  const handleSaveSettings = () => {
    setDownloadPath(tempPath);
    localStorage.setItem('localDownloadPath', tempPath);
    setIsSettingsOpen(false);
  };

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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* 设置按钮 */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
        title="下载设置"
      >
        <Settings className="w-6 h-6 text-gray-600" />
      </button>

      {/* 设置模态框 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                下载设置
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                本地下载目录
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Folder className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={tempPath}
                    onChange={(e) => setTempPath(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="例如: C:\Downloads\output"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                * 请确保后端应用对该目录有写入权限。批量下载相册将使用浏览器默认下载。
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center shadow-sm"
              >
                <Check className="w-4 h-4 mr-1.5" />
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
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