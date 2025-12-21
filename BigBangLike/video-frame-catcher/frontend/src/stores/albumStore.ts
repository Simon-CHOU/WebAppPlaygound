import { create } from 'zustand';
import { Album, AlbumStatus, AlbumStatistics } from '../types/album';
import { apiService } from '../services/api';

interface AlbumStore {
  albums: Album[];
  currentAlbum: Album | null;
  statistics: AlbumStatistics | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };

  // Actions
  fetchAlbums: (params?: { page?: number; size?: number; sortBy?: string; sortDir?: string }) => Promise<void>;
  fetchAlbum: (id: number) => Promise<void>;
  createAlbum: (data: { videoFile: File; name: string }) => Promise<Album>;
  searchAlbums: (keyword: string, page?: number, size?: number) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  deleteAlbum: (id: number) => Promise<void>;
  retryProcessing: (id: number) => Promise<void>;
  updateAlbumStatus: (id: number, status: AlbumStatus) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  albums: [],
  currentAlbum: null,
  statistics: null,
  loading: false,
  error: null,
  pagination: {
    page: 0,
    size: 20,
    total: 0,
    totalPages: 0,
  },

  fetchAlbums: async (params = {}) => {
    set({ loading: true, error: null });

    try {
      const defaultParams = {
        page: 0,
        size: 20,
        sortBy: 'createdAt',
        sortDir: 'desc',
        ...params,
      };

      const response = await apiService.getAlbums(defaultParams);

      set({
        albums: response.content || response,
        pagination: {
          page: response.number || 0,
          size: response.size || 20,
          total: response.totalElements || 0,
          totalPages: response.totalPages || 0,
        },
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch albums',
        loading: false,
      });
    }
  },

  fetchAlbum: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const album = await apiService.getAlbum(id);
      set({ currentAlbum: album, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch album',
        loading: false,
      });
    }
  },

  createAlbum: async (data) => {
    set({ loading: true, error: null });

    try {
      const album = await apiService.createAlbum(data);

      // 添加到相册列表
      set(state => ({
        albums: [album, ...state.albums],
        loading: false,
      }));

      return album;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create album',
        loading: false,
      });
      throw error;
    }
  },

  searchAlbums: async (keyword: string, page = 0, size = 20) => {
    set({ loading: true, error: null });

    try {
      const response = await apiService.searchAlbums({ keyword, page, size });

      set({
        albums: response.content || response,
        pagination: {
          page: response.number || 0,
          size: response.size || 20,
          total: response.totalElements || 0,
          totalPages: response.totalPages || 0,
        },
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to search albums',
        loading: false,
      });
    }
  },

  fetchStatistics: async () => {
    try {
      const statistics = await apiService.getAlbumStatistics();
      set({ statistics });
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  },

  deleteAlbum: async (id: number) => {
    set({ loading: true, error: null });

    try {
      await apiService.deleteAlbum(id);

      set(state => ({
        albums: state.albums.filter(album => album.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete album',
        loading: false,
      });
    }
  },

  retryProcessing: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const album = await apiService.retryProcessing(id);

      set(state => ({
        albums: state.albums.map(a => a.id === id ? album : a),
        currentAlbum: state.currentAlbum?.id === id ? album : state.currentAlbum,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to retry processing',
        loading: false,
      });
    }
  },

  updateAlbumStatus: (id: number, status: AlbumStatus) => {
    set(state => ({
      albums: state.albums.map(album =>
        album.id === id ? { ...album, status } : album
      ),
      currentAlbum: state.currentAlbum?.id === id
        ? { ...state.currentAlbum, status }
        : state.currentAlbum,
    }));
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    albums: [],
    currentAlbum: null,
    statistics: null,
    loading: false,
    error: null,
    pagination: {
      page: 0,
      size: 20,
      total: 0,
      totalPages: 0,
    },
  }),
}));