import { Pool } from 'pg';
import { DbAdapter } from './DbAdapter';
import { Task, Image } from '../../services/taskService';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'ffmpeg_catcher',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

export class LocalPgAdapter implements DbAdapter {
  async createTask(originalFilename: string, albumName: string): Promise<Task> {
    const query = `
      INSERT INTO tasks (id, original_filename, album_name, status, progress)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const id = uuidv4();
    const values = [id, originalFilename, albumName, 'pending', 0];
    
    try {
      const res = await pool.query(query, values);
      return res.rows[0];
    } catch (err: any) {
      throw new Error(`Failed to create task in Local PG: ${err.message}`);
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    try {
      const res = await pool.query(query, [taskId]);
      return res.rows[0] || null;
    } catch (err) {
      console.error('LocalPgAdapter.getTask error:', err);
      return null;
    }
  }

  async updateTaskProgress(taskId: string, progress: number, status: string): Promise<void> {
    const query = `
      UPDATE tasks 
      SET progress = GREATEST(progress, $1), status = $2, updated_at = NOW()
      WHERE id = $3
    `;
    try {
      await pool.query(query, [progress, status, taskId]);
    } catch (err: any) {
      throw new Error(`Failed to update task progress in Local PG: ${err.message}`);
    }
  }

  async updateTaskStatus(taskId: string, status: string, totalFrames?: number): Promise<void> {
    let query = 'UPDATE tasks SET status = $1, updated_at = NOW()';
    const values: any[] = [status];

    if (totalFrames !== undefined) {
      query += ', total_frames = $2';
      values.push(totalFrames);
    }

    query += ` WHERE id = $${values.length + 1}`;
    values.push(taskId);

    try {
      await pool.query(query, values);
    } catch (err: any) {
      throw new Error(`Failed to update task status in Local PG: ${err.message}`);
    }
  }

  async createImage(taskId: string, frameNumber: number, filename: string, filePath: string, fileSize?: number): Promise<Image> {
    const query = `
      INSERT INTO images (id, task_id, frame_number, filename, file_path, file_size)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const id = uuidv4();
    const values = [id, taskId, frameNumber, filename, filePath, fileSize || null];

    try {
      const res = await pool.query(query, values);
      return res.rows[0];
    } catch (err: any) {
      throw new Error(`Failed to create image in Local PG: ${err.message}`);
    }
  }

  async getImagesByTask(taskId: string): Promise<Image[]> {
    const query = 'SELECT * FROM images WHERE task_id = $1 ORDER BY frame_number ASC';
    try {
      const res = await pool.query(query, [taskId]);
      return res.rows;
    } catch (err: any) {
      throw new Error(`Failed to get images from Local PG: ${err.message}`);
    }
  }
}
