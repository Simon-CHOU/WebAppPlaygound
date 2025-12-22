import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PhotoAlbum from '../PhotoAlbum';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock fetch
global.fetch = vi.fn();

// Mock React Router
const renderWithRouter = (ui: React.ReactElement, { route = '/album/test-album-id' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/album/:albumId" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PhotoAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该显示加载状态', () => {
    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    
    renderWithRouter(<PhotoAlbum />);
    
    expect(screen.getByText(/加载中/)).toBeInTheDocument();
  });

  it('应该显示相册信息', async () => {
    const mockAlbumData = {
      albumId: 'test-album-id',
      name: 'Test Video',
      totalFrames: 100,
      resolution: '1920x1080',
      createdAt: '2024-01-01T00:00:00Z',
      images: [
        {
          id: '1',
          frameNumber: 1,
          filename: 'frame_0001.heic',
          filePath: '/albums/test/frame_0001.heic',
          fileSize: 102400,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2', 
          frameNumber: 2,
          filename: 'frame_0002.heic',
          filePath: '/albums/test/frame_0002.heic',
          fileSize: 102400,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlbumData
    });

    renderWithRouter(<PhotoAlbum />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
      expect(screen.getByText(/总帧数: 100/)).toBeInTheDocument();
      expect(screen.getByText(/分辨率: 1920x1080/)).toBeInTheDocument();
    });
  });

  it('应该显示图片网格', async () => {
    const mockAlbumData = {
      albumId: 'test-album-id',
      name: 'Test Video',
      totalFrames: 2,
      resolution: '1920x1080',
      createdAt: '2024-01-01T00:00:00Z',
      images: [
        {
          id: '1',
          frameNumber: 1,
          filename: 'frame_0001.heic',
          filePath: '/albums/test/frame_0001.heic',
          fileSize: 102400,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          frameNumber: 2,
          filename: 'frame_0002.heic',
          filePath: '/albums/test/frame_0002.heic',
          fileSize: 102400,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlbumData
    });

    renderWithRouter(<PhotoAlbum />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(2);
      expect(screen.getByText('帧 #1')).toBeInTheDocument();
      expect(screen.getByText('帧 #2')).toBeInTheDocument();
    });
  });

  it('应该处理API错误', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    renderWithRouter(<PhotoAlbum />);
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });
  });

  it('应该处理404错误', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404
    });
    
    renderWithRouter(<PhotoAlbum />);
    
    await waitFor(() => {
      expect(screen.getByText(/相册不存在/)).toBeInTheDocument();
    });
  });
});