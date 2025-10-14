import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export class VideoDownloader {
  private downloadsPath: string;

  constructor(downloadsPath: string = './downloads') {
    this.downloadsPath = downloadsPath;
    this.ensureDownloadsDirectory();
  }

  private async ensureDownloadsDirectory() {
    if (!existsSync(this.downloadsPath)) {
      await fs.mkdir(this.downloadsPath, { recursive: true });
    }
  }

  async downloadVideo(videoId: string, title: string): Promise<string | null> {
    try {
      await this.ensureDownloadsDirectory();

      // Sanitize filename
      const safeTitle = title.replace(/[^a-z0-9\s-]/gi, '_').substring(0, 100);
      const outputTemplate = path.join(this.downloadsPath, `${videoId}-${safeTitle}.%(ext)s`);

      console.log(`Downloading video: ${title} (${videoId})`);

      // Use yt-dlp to download the video
      // Format options: bestvideo+bestaudio/best (merges best video and audio)
      const command = `yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 -o "${outputTemplate}" "https://www.youtube.com/watch?v=${videoId}"`;

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr && !stderr.includes('Deleting original file')) {
        console.log(`yt-dlp stderr: ${stderr}`);
      }

      // Find the downloaded file
      const files = await fs.readdir(this.downloadsPath);
      const videoFile = files.find(f => f.startsWith(videoId));

      if (videoFile) {
        const relativePath = path.join('downloads', videoFile);
        console.log(`✓ Downloaded: ${videoFile}`);
        return relativePath;
      }

      console.warn(`Video downloaded but file not found: ${videoId}`);
      return null;
    } catch (error: any) {
      console.error(`Error downloading video ${videoId}:`, error.message);
      return null;
    }
  }

  async isVideoDownloaded(videoId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.downloadsPath);
      return files.some(f => f.startsWith(videoId));
    } catch {
      return false;
    }
  }

  async getVideoPath(videoId: string): Promise<string | null> {
    try {
      const files = await fs.readdir(this.downloadsPath);
      const videoFile = files.find(f => f.startsWith(videoId));
      return videoFile ? path.join(this.downloadsPath, videoFile) : null;
    } catch {
      return null;
    }
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.downloadsPath);
      const videoFile = files.find(f => f.startsWith(videoId));

      if (videoFile) {
        await fs.unlink(path.join(this.downloadsPath, videoFile));
        console.log(`Deleted video: ${videoFile}`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(`Error deleting video ${videoId}:`, error.message);
      return false;
    }
  }

  async getDownloadedVideosCount(): Promise<number> {
    try {
      const files = await fs.readdir(this.downloadsPath);
      return files.filter(f => f.endsWith('.mp4')).length;
    } catch {
      return 0;
    }
  }
}
