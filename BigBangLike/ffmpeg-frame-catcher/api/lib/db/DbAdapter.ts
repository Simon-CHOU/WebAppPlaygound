import { Task, Image } from '../services/taskService';

export interface DbAdapter {
  createTask(originalFilename: string, albumName: string): Promise<Task>;
  getTask(taskId: string): Promise<Task | null>;
  updateTaskProgress(taskId: string, progress: number, status: string): Promise<void>;
  updateTaskStatus(taskId: string, status: string, totalFrames?: number): Promise<void>;
  createImage(taskId: string, frameNumber: number, filename: string, filePath: string, fileSize?: number): Promise<Image>;
  getImagesByTask(taskId: string): Promise<Image[]>;
}
