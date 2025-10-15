import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export interface DownloadStatus {
  videoId: string;
  title: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export class VideoDownloader {
  private downloadsPath: string;
  private downloadQueue: Map<string, DownloadStatus> = new Map();
  private failedDownloads: string[] = [];

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
    // Update status to downloading
    this.downloadQueue.set(videoId, {
      videoId,
      title,
      status: 'downloading',
      startedAt: new Date().toISOString()
    });

    try {
      await this.ensureDownloadsDirectory();

      // Sanitize filename
      const safeTitle = title.replace(/[^a-z0-9\s-]/gi, '_').substring(0, 100);
      const outputTemplate = path.join(this.downloadsPath, `${videoId}-${safeTitle}.%(ext)s`);

      console.log(`Downloading video: ${title} (${videoId})`);

      // Try multiple format options with fallbacks
      const formatOptions = [
        'bestvideo[height<=1080]+bestaudio/best[height<=1080]', // Best quality with merge
        'best[height<=1080]',                                     // Single file, no merge needed
        'bestvideo[height<=720]+bestaudio/best[height<=720]',   // Lower quality with merge
        'best[height<=720]',                                      // Lower quality, no merge
        'best'                                                    // Fallback to any quality
      ];

      let lastError: any = null;
      let downloadSuccess = false;

      for (const format of formatOptions) {
        try {
          const command = `yt-dlp -f "${format}" --merge-output-format mp4 -o "${outputTemplate}" "https://www.youtube.com/watch?v=${videoId}"`;

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
            console.log(`✓ Downloaded: ${videoFile} (using format: ${format})`);

            // Update status to completed
            this.downloadQueue.set(videoId, {
              videoId,
              title,
              status: 'completed',
              startedAt: this.downloadQueue.get(videoId)?.startedAt,
              completedAt: new Date().toISOString()
            });

            downloadSuccess = true;
            return relativePath;
          }
        } catch (error: any) {
          console.log(`Format "${format}" failed, trying next...`);
          lastError = error;
          continue;
        }
      }

      // If we get here, all formats failed
      console.error(`All download attempts failed for ${videoId}:`, lastError?.message);
      this.downloadQueue.set(videoId, {
        videoId,
        title,
        status: 'failed',
        error: lastError?.message || 'All format options failed',
        startedAt: this.downloadQueue.get(videoId)?.startedAt,
        completedAt: new Date().toISOString()
      });
      this.failedDownloads.push(videoId);
      return null;
    } catch (error: any) {
      console.error(`Error downloading video ${videoId}:`, error.message);
      this.downloadQueue.set(videoId, {
        videoId,
        title,
        status: 'failed',
        error: error.message,
        startedAt: this.downloadQueue.get(videoId)?.startedAt,
        completedAt: new Date().toISOString()
      });
      this.failedDownloads.push(videoId);
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

  getDownloadStatus(videoId: string): DownloadStatus | null {
    return this.downloadQueue.get(videoId) || null;
  }

  getAllDownloadStatuses(): DownloadStatus[] {
    return Array.from(this.downloadQueue.values());
  }

  getFailedDownloads(): string[] {
    return [...this.failedDownloads];
  }

  clearDownloadQueue(): void {
    // Keep failed ones for reference
    const failed = Array.from(this.downloadQueue.entries())
      .filter(([_, status]) => status.status === 'failed');

    this.downloadQueue.clear();
    failed.forEach(([id, status]) => this.downloadQueue.set(id, status));
  }
}
