import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../FileUpload';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = vi.fn();

describe('FileUpload', () => {
  const mockOnUpload = vi.fn();
  const mockOnProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染拖拽上传区域', () => {
    render(<FileUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    expect(screen.getByText(/拖拽MP4文件到此处/)).toBeInTheDocument();
    expect(screen.getByText(/或点击选择文件/)).toBeInTheDocument();
  });

  it('应该处理文件选择', async () => {
    const user = userEvent.setup();
    render(<FileUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText('file-input') as HTMLInputElement;
    
    await user.upload(input, file);
    
    expect(mockOnUpload).toHaveBeenCalledWith(file);
  });

  it('应该拒绝非MP4文件', async () => {
    const user = userEvent.setup();
    render(<FileUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('file-input') as HTMLInputElement;
    
    await user.upload(input, file);
    
    expect(mockOnUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/请选择MP4格式的视频文件/)).toBeInTheDocument();
  });

  it('应该显示上传进度', () => {
    render(
      <FileUpload 
        onUpload={mockOnUpload} 
        onProgress={mockOnProgress}
        uploadProgress={50}
        isUploading={true}
      />
    );
    
    expect(screen.getByText(/上传中... 50%/)).toBeInTheDocument();
  });

  it('应该显示处理状态', () => {
    render(
      <FileUpload 
        onUpload={mockOnUpload} 
        onProgress={mockOnProgress}
        processingStatus="processing"
        processingProgress={75}
      />
    );
    
    expect(screen.getByText(/处理中... 75%/)).toBeInTheDocument();
  });
});