import { supabase } from '../supabase';
import { DbAdapter } from './DbAdapter';
import { Task, Image } from '../../services/taskService';

export class SupabaseAdapter implements DbAdapter {
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
      throw new Error(`Failed to create task in Supabase: ${error.message}`);
    }

    return data;
  }

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
  }

  async updateTaskProgress(taskId: string, progress: number, status: string): Promise<void> {
    // 首先获取当前进度，确保不会回退
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('progress')
      .eq('id', taskId)
      .single();

    if (currentTask && currentTask.progress > progress) {
      // 如果当前数据库中的进度更大，则忽略本次更新（但可能需要更新状态）
      if (status === 'processing') {
        return; 
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update({ 
        progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to update task progress in Supabase: ${error.message}`);
    }
  }

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
      throw new Error(`Failed to update task status in Supabase: ${error.message}`);
    }
  }

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
      throw new Error(`Failed to create image in Supabase: ${error.message}`);
    }

    return data;
  }

  async getImagesByTask(taskId: string): Promise<Image[]> {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('task_id', taskId)
      .order('frame_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to get images from Supabase: ${error.message}`);
    }

    return data || [];
  }
}
