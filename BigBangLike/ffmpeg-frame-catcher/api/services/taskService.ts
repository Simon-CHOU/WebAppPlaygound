import { DbFactory, DataSource } from '../lib/db/DbFactory';

export interface Task {
  id: string;
  original_filename: string;
  album_name: string;
  total_frames: number;
  resolution: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  task_id: string;
  frame_number: number;
  filename: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

export const taskService = {
  async createTask(originalFilename: string, albumName: string, dataSource: DataSource = 'supabase'): Promise<Task> {
    const db = DbFactory.getAdapter(dataSource);
    return db.createTask(originalFilename, albumName);
  },

  async getTask(taskId: string, dataSource: DataSource = 'supabase'): Promise<Task | null> {
    const db = DbFactory.getAdapter(dataSource);
    return db.getTask(taskId);
  },

  async updateTaskProgress(taskId: string, progress: number, status: string, dataSource: DataSource = 'supabase'): Promise<void> {
    const db = DbFactory.getAdapter(dataSource);
    return db.updateTaskProgress(taskId, progress, status);
  },

  async updateTaskStatus(taskId: string, status: string, totalFrames?: number, dataSource: DataSource = 'supabase'): Promise<void> {
    const db = DbFactory.getAdapter(dataSource);
    return db.updateTaskStatus(taskId, status, totalFrames);
  },

  async createImage(taskId: string, frameNumber: number, filename: string, filePath: string, fileSize?: number, dataSource: DataSource = 'supabase'): Promise<Image> {
    const db = DbFactory.getAdapter(dataSource);
    return db.createImage(taskId, frameNumber, filename, filePath, fileSize);
  },

  async getImagesByTask(taskId: string, dataSource: DataSource = 'supabase'): Promise<Image[]> {
    const db = DbFactory.getAdapter(dataSource);
    return db.getImagesByTask(taskId);
  }
};