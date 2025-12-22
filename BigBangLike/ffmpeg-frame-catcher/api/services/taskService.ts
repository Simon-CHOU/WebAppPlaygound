import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
  async createTask(originalFilename: string, albumName: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          original_filename: originalFilename,
          album_name: albumName,
          status: 'pending',
          progress: 0
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return data;
  },

  async getTask(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  async updateTaskProgress(taskId: string, progress: number, status: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ 
        progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  },

  async updateTaskStatus(taskId: string, status: string, totalFrames?: number): Promise<void> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (totalFrames !== undefined) {
      updateData.total_frames = totalFrames;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to update task status: ${error.message}`);
    }
  },

  async createImage(taskId: string, frameNumber: number, filename: string, filePath: string, fileSize?: number): Promise<Image> {
    const { data, error } = await supabase
      .from('images')
      .insert([
        {
          task_id: taskId,
          frame_number: frameNumber,
          filename,
          file_path: filePath,
          file_size: fileSize || null
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create image: ${error.message}`);
    }

    return data;
  },

  async getImagesByTask(taskId: string): Promise<Image[]> {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('task_id', taskId)
      .order('frame_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to get images: ${error.message}`);
    }

    return data || [];
  }
};