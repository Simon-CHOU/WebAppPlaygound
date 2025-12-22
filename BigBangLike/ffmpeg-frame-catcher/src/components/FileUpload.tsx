import React, { useState, useRef } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => void;
  onProgress: (progress: number) => void;
  uploadProgress?: number;
  isUploading?: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingProgress?: number;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  onProgress,
  uploadProgress = 0,
  isUploading = false,
  processingStatus,
  processingProgress = 0,
  error
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mp4')) {
      alert('请选择MP4格式的视频文件');
      return;
    }
    
    onUpload(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusText = () => {
    if (isUploading) {
      return `上传中... ${uploadProgress}%`;
    }
    
    if (processingStatus === 'processing') {
      return `处理中... ${processingProgress}%`;
    }
    
    if (processingStatus === 'completed') {
      return '处理完成！正在跳转...';
    }
    
    if (processingStatus === 'failed') {
      return '处理失败，请重试';
    }
    
    return '拖拽MP4文件到此处，或点击选择文件';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading || processingStatus === 'processing' ? 'opacity-75 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,video/*"
          onChange={handleInputChange}
          className="hidden"
          aria-label="file-input"
        />
        
        <div className="flex flex-col items-center space-y-4">
          {error ? (
            <AlertCircle className="w-12 h-12 text-red-500" />
          ) : (
            <FileVideo className="w-12 h-12 text-gray-400" />
          )}
          
          <div className="text-lg font-medium text-gray-700">
            {getStatusText()}
          </div>
          
          {(isUploading || processingStatus === 'processing') && (
            <div className="w-full max-w-xs">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${isUploading ? uploadProgress : processingProgress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            支持 MP4 格式，最大 2GB
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;