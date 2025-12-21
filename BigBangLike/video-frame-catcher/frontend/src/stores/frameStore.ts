import { create } from 'zustand';
import { Frame } from '../types/frame';
import { apiService } from '../services/api';

interface FrameStore {
  frames: Frame[];
  currentFrame: Frame | null;
  favoriteFrames: Frame[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };

  // Actions
  fetchFramesByAlbum: (albumId: number, params?: { page?: number; size?: number; sortBy?: string; sortDir?: string }) => Promise<void>;
  fetchFrame: (id: number) => Promise<void>;
  fetchFavoriteFramesByAlbum: (albumId: number) => Promise<void>;
  fetchAllFavoriteFrames: () => Promise<void>;
  updateFrame: (id: number, data: { isFavorite: boolean; qualityScore?: number }) => Promise<void>;
  batchUpdateFavoriteStatus: (frameIds: number[], favorite: boolean) => Promise<void>;
  getFramesByTimeRange: (albumId: number, startTime: number, endTime: number) => Promise<Frame[]>;
  getTopQualityFrames: (albumId: number, limit?: number) => Promise<Frame[]>;
  deleteFrame: (id: number) => Promise<void>;
  updateFrameFavorite: (id: number, isFavorite: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

export const useFrameStore = create<FrameStore>((set, get) => ({
  frames: [],
  currentFrame: null,
  favoriteFrames: [],
  loading: false,
  error: null,
  pagination: {
    page: 0,
    size: 50,
    total: 0,
    totalPages: 0,
  },

  fetchFramesByAlbum: async (albumId: number, params = {}) => {
    set({ loading: true, error: null });

    try {
      const defaultParams = {
        page: 0,
        size: 50,
        sortBy: 'timestamp',
        sortDir: 'asc',
        ...params,
      };

      const response = await apiService.getFramesByAlbum(albumId, defaultParams);

      // 为每帧添加图片URL
      const framesWithUrls = (response.content || response).map((frame: Frame) => ({
        ...frame,
        imageUrl: apiService.getFrameImageUrl(frame.id, false),
        thumbnailUrl: frame.thumbnailPath ? apiService.getFrameImageUrl(frame.id, true) : undefined,
      }));

      set({
        frames: framesWithUrls,
        pagination: {
          page: response.number || 0,
          size: response.size || 50,
          total: response.totalElements || 0,
          totalPages: response.totalPages || 0,
        },
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch frames',
        loading: false,
      });
    }
  },

  fetchFrame: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const frame = await apiService.getFrame(id);

      // 添加图片URL
      const frameWithUrls = {
        ...frame,
        imageUrl: apiService.getFrameImageUrl(frame.id, false),
        thumbnailUrl: frame.thumbnailPath ? apiService.getFrameImageUrl(frame.id, true) : undefined,
      };

      set({
        currentFrame: frameWithUrls,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch frame',
        loading: false,
      });
    }
  },

  fetchFavoriteFramesByAlbum: async (albumId: number) => {
    set({ loading: true, error: null });

    try {
      const frames = await apiService.getFavoriteFramesByAlbum(albumId);

      const framesWithUrls = frames.map(frame => ({
        ...frame,
        imageUrl: apiService.getFrameImageUrl(frame.id, false),
        thumbnailUrl: frame.thumbnailPath ? apiService.getFrameImageUrl(frame.id, true) : undefined,
      }));

      set({
        favoriteFrames: framesWithUrls,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch favorite frames',
        loading: false,
      });
    }
  },

  fetchAllFavoriteFrames: async () => {
    set({ loading: true, error: null });

    try {
      const frames = await apiService.getAllFavoriteFrames();

      const framesWithUrls = frames.map(frame => ({
        ...frame,
        imageUrl: apiService.getFrameImageUrl(frame.id, false),
        thumbnailUrl: frame.thumbnailPath ? apiService.getFrameImageUrl(frame.id, true) : undefined,
      }));

      set({
        favoriteFrames: framesWithUrls,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch all favorite frames',
        loading: false,
      });
    }
  },

  updateFrame: async (id: number, data) => {
    set({ loading: true, error: null });

    try {
      const updatedFrame = await apiService.updateFrame(id, data);

      set(state => ({
        frames: state.frames.map(frame =>
          frame.id === id ? updatedFrame : frame
        ),
        currentFrame: state.currentFrame?.id === id ? updatedFrame : state.currentFrame,
        favoriteFrames: state.favoriteFrames.map(frame =>
          frame.id === id ? updatedFrame : frame
        ),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update frame',
        loading: false,
      });
    }
  },

  batchUpdateFavoriteStatus: async (frameIds: number[], favorite: boolean) => {
    set({ loading: true, error: null });

    try {
      await apiService.batchUpdateFavoriteStatus(frameIds, favorite);

      set(state => ({
        frames: state.frames.map(frame =>
          frameIds.includes(frame.id) ? { ...frame, isFavorite: favorite } : frame
        ),
        favoriteFrames: favorite
          ? [...state.favoriteFrames, ...state.frames.filter(f => frameIds.includes(f.id) && f.isFavorite !== favorite)]
          : state.favoriteFrames.filter(f => !frameIds.includes(f.id)),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to batch update favorite status',
        loading: false,
      });
    }
  },

  getFramesByTimeRange: async (albumId: number, startTime: number, endTime: number) => {
    try {
      const frames = await apiService.getFramesByTimeRange(albumId, startTime, endTime);

      return frames.map(frame => ({
        ...frame,
        imageUrl: apiService.getFrameImageUrl(frame.id, false),
        thumbnailUrl: frame.thumbnailPath ? apiService.getFrameImageUrl(frame.id, true) : undefined,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get frames by time range',
      });
      return [];
    }
  },

  getTopQualityFrames: async (albumId: number, limit = 10) => {
    try {
      const frames = await apiService.getTopQualityFrames(albumId, limit);

      return frames.map(frame => ({
        ...frame,
        imageUrl: apiService.getFrameImageUrl(frame.id, false),
        thumbnailUrl: frame.thumbnailPath ? apiService.getFrameImageUrl(frame.id, true) : undefined,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get top quality frames',
      });
      return [];
    }
  },

  deleteFrame: async (id: number) => {
    set({ loading: true, error: null });

    try {
      await apiService.deleteFrame(id);

      set(state => ({
        frames: state.frames.filter(frame => frame.id !== id),
        currentFrame: state.currentFrame?.id === id ? null : state.currentFrame,
        favoriteFrames: state.favoriteFrames.filter(frame => frame.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete frame',
        loading: false,
      });
    }
  },

  updateFrameFavorite: (id: number, isFavorite: boolean) => {
    set(state => ({
      frames: state.frames.map(frame =>
        frame.id === id ? { ...frame, isFavorite } : frame
      ),
      currentFrame: state.currentFrame?.id === id
        ? { ...state.currentFrame, isFavorite }
        : state.currentFrame,
    }));
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    frames: [],
    currentFrame: null,
    favoriteFrames: [],
    loading: false,
    error: null,
    pagination: {
      page: 0,
      size: 50,
      total: 0,
      totalPages: 0,
    },
  }),
}));