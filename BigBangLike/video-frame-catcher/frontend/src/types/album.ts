export interface Album {
  id: number;
  name: string;
  originalFilename: string;
  videoPath: string;
  fileSize: number;
  duration: number;
  frameRate: number;
  width: number;
  height: number;
  videoCodec?: string;
  storageType: string;
  storagePath?: string;
  status: AlbumStatus;
  frameCount?: number;
  favoriteCount?: number;
  totalFrameSize?: number;
  processingProgress?: number;
  createdAt: string;
  updatedAt: string;
}

export enum AlbumStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface AlbumCreateRequest {
  videoFile: File;
  name: string;
}

export interface AlbumStatistics {
  totalAlbums: number;
  processingAlbums: number;
  completedAlbums: number;
  failedAlbums: number;
  totalFrames: number;
  totalFavoriteFrames: number;
  totalStorageUsed: number;
  albumsByStatus: Record<string, number>;
}