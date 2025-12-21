export interface Frame {
  id: number;
  albumId: number;
  filename: string;
  filePath: string;
  timestamp: number;
  frameNumber: number;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  qualityScore?: number;
  isFavorite: boolean;
  thumbnailPath?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FrameUpdateRequest {
  isFavorite: boolean;
  qualityScore?: number;
}