import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Album, AlbumCreateRequest, AlbumStatistics } from '../types/album';
import { Frame, FrameUpdateRequest } from '../types/frame';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        // 可以在这里添加认证token
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Album APIs
  async getAlbums(params: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  } = {}) {
    const response = await this.api.get('/albums', { params });
    return response.data;
  }

  async getAlbum(id: number): Promise<Album> {
    const response = await this.api.get(`/albums/${id}`);
    return response.data;
  }

  async createAlbum(data: AlbumCreateRequest): Promise<Album> {
    const formData = new FormData();
    formData.append('videoFile', data.videoFile);
    formData.append('name', data.name);

    const response = await this.api.post('/albums', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async searchAlbums(params: {
    keyword: string;
    page?: number;
    size?: number;
  }) {
    const response = await this.api.get('/albums/search', { params });
    return response.data;
  }

  async getAlbumStatistics(): Promise<AlbumStatistics> {
    const response = await this.api.get('/albums/statistics');
    return response.data;
  }

  async deleteAlbum(id: number): Promise<void> {
    await this.api.delete(`/albums/${id}`);
  }

  async retryProcessing(id: number): Promise<Album> {
    const response = await this.api.post(`/albums/${id}/retry`);
    return response.data;
  }

  async getProcessingAlbumsCount(): Promise<number> {
    const response = await this.api.get('/albums/processing/count');
    return response.data;
  }

  // Frame APIs
  async getFramesByAlbum(albumId: number, params: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  } = {}) {
    const response = await this.api.get(`/frames/album/${albumId}`, { params });
    return response.data;
  }

  async getFrame(id: number): Promise<Frame> {
    const response = await this.api.get(`/frames/${id}`);
    return response.data;
  }

  getFrameImageUrl(frameId: number, thumbnail = false): string {
    return `${this.api.defaults.baseURL}/frames/${frameId}/image${thumbnail ? '?thumbnail=true' : ''}`;
  }

  async getFavoriteFramesByAlbum(albumId: number): Promise<Frame[]> {
    const response = await this.api.get(`/frames/album/${albumId}/favorites`);
    return response.data;
  }

  async getAllFavoriteFrames(): Promise<Frame[]> {
    const response = await this.api.get('/frames/favorites');
    return response.data;
  }

  async updateFrame(id: number, data: FrameUpdateRequest): Promise<Frame> {
    const response = await this.api.put(`/frames/${id}`, data);
    return response.data;
  }

  async batchUpdateFavoriteStatus(frameIds: number[], favorite: boolean): Promise<void> {
    const params = new URLSearchParams();
    params.append('favorite', favorite.toString());
    frameIds.forEach(id => params.append('frameIds', id.toString()));

    await this.api.put(`/frames/batch/favorite?${params.toString()}`);
  }

  async getFramesByTimeRange(albumId: number, startTime: number, endTime: number): Promise<Frame[]> {
    const response = await this.api.get(`/frames/album/${albumId}/range`, {
      params: { startTime, endTime }
    });
    return response.data;
  }

  async getTopQualityFrames(albumId: number, limit = 10): Promise<Frame[]> {
    const response = await this.api.get(`/frames/album/${albumId}/top-quality`, {
      params: { limit }
    });
    return response.data;
  }

  async deleteFrame(id: number): Promise<void> {
    await this.api.delete(`/frames/${id}`);
  }
}

export const apiService = new ApiService();