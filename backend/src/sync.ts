import { DatabaseService } from './database.js';
import { YouTubeService } from './youtube.js';
import { VideoDownloader } from './downloader.js';

export class SyncService {
  constructor(
    private db: DatabaseService,
    private youtube: YouTubeService,
    private channelId: string,
    private downloader?: VideoDownloader
  ) {}

  async performFullSync(): Promise<void> {
    const syncId = this.db.createSyncStatus();
    let videosAdded = 0;
    let videosUpdated = 0;
    let commentsAdded = 0;

    try {
      console.log('Starting full sync...');

      // Sync channel info
      console.log('Fetching channel info...');
      const channelInfo = await this.youtube.getChannelInfo(this.channelId);
      this.db.upsertChannelInfo(channelInfo);
      console.log(`Channel: ${channelInfo.title} (${channelInfo.videoCount} videos)`);

      // Sync all videos
      console.log('Fetching videos...');
      for await (const videoBatch of this.youtube.getAllChannelVideos(this.channelId)) {
        for (const video of videoBatch) {
          const result = this.db.upsertVideo(video);
          if (result.isNew) {
            videosAdded++;
          } else {
            videosUpdated++;
          }
        }
        console.log(`Progress: ${videosAdded + videosUpdated} videos processed (${videosAdded} new, ${videosUpdated} updated)`);
      }

      // Sync comments for all videos
      console.log('Fetching comments...');
      const allVideos = this.db.getAllVideos();
      let videoCount = 0;

      for (const video of allVideos) {
        videoCount++;
        console.log(`Fetching comments for video ${videoCount}/${allVideos.length}: ${video.title}`);

        try {
          for await (const commentBatch of this.youtube.getAllVideoComments(video.id)) {
            for (const comment of commentBatch) {
              const result = this.db.upsertComment(comment);
              if (result.isNew) {
                commentsAdded++;
              }
            }
          }
          console.log(`  - ${this.db.getCommentsByVideo(video.id).length} comments total for this video`);
        } catch (error: any) {
          console.error(`  - Error fetching comments: ${error.message}`);
        }
      }

      // Download videos if enabled
      const shouldDownloadVideos = process.env.DOWNLOAD_VIDEOS === 'true';
      let videosDownloaded = 0;

      if (shouldDownloadVideos && this.downloader) {
        console.log('\nDownloading videos for offline viewing...');
        const videosToDownload = this.db.getVideosWithoutDownloads();
        console.log(`Found ${videosToDownload.length} videos to download`);

        for (const video of videosToDownload) {
          try {
            console.log(`Downloading ${videosDownloaded + 1}/${videosToDownload.length}: ${video.title}`);
            const localPath = await this.downloader.downloadVideo(video.id, video.title);
            if (localPath) {
              this.db.updateVideoLocalPath(video.id, localPath);
              videosDownloaded++;
            }
          } catch (error: any) {
            console.error(`  - Error downloading: ${error.message}`);
          }
        }

        console.log(`✓ Downloaded ${videosDownloaded} videos`);
      }

      this.db.updateSyncStatus(syncId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        videosAdded,
        videosUpdated,
        commentsAdded
      });

      console.log('\nSync completed successfully!');
      console.log(`- Videos added: ${videosAdded}`);
      console.log(`- Videos updated: ${videosUpdated}`);
      console.log(`- Comments added: ${commentsAdded}`);
      if (shouldDownloadVideos) {
        console.log(`- Videos downloaded: ${videosDownloaded}`);
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      this.db.updateSyncStatus(syncId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error.message
      });
      throw error;
    }
  }

  async performIncrementalSync(): Promise<void> {
    const syncId = this.db.createSyncStatus();
    let videosAdded = 0;
    let videosUpdated = 0;
    let commentsAdded = 0;

    try {
      console.log('Starting incremental sync...');

      // Update channel info
      const channelInfo = await this.youtube.getChannelInfo(this.channelId);
      this.db.upsertChannelInfo(channelInfo);

      // Get existing video IDs
      const existingVideos = this.db.getAllVideos();
      const existingVideoIds = new Set(existingVideos.map(v => v.id));

      // Check for new videos
      console.log('Checking for new videos...');
      for await (const videoBatch of this.youtube.getAllChannelVideos(this.channelId)) {
        for (const video of videoBatch) {
          const result = this.db.upsertVideo(video);
          if (result.isNew) {
            videosAdded++;
            console.log(`New video found: ${video.title}`);

            // Fetch comments for new videos
            try {
              for await (const commentBatch of this.youtube.getAllVideoComments(video.id)) {
                for (const comment of commentBatch) {
                  const commentResult = this.db.upsertComment(comment);
                  if (commentResult.isNew) {
                    commentsAdded++;
                  }
                }
              }
            } catch (error: any) {
              console.error(`Error fetching comments for new video: ${error.message}`);
            }
          }
        }
      }

      // Update stats for existing videos (in batches)
      console.log('Updating video statistics...');
      const videoIds = Array.from(existingVideoIds);
      const updatedVideos = await this.youtube.getUpdatedVideos(videoIds);

      for (const video of updatedVideos) {
        const result = this.db.upsertVideo(video);
        if (!result.isNew) {
          videosUpdated++;
        }
      }

      // Download videos if enabled
      const shouldDownloadVideos = process.env.DOWNLOAD_VIDEOS === 'true';
      let videosDownloaded = 0;

      if (shouldDownloadVideos && this.downloader) {
        console.log('\nDownloading new videos for offline viewing...');
        const videosToDownload = this.db.getVideosWithoutDownloads();

        if (videosToDownload.length > 0) {
          console.log(`Found ${videosToDownload.length} videos to download`);

          for (const video of videosToDownload) {
            try {
              console.log(`Downloading ${videosDownloaded + 1}/${videosToDownload.length}: ${video.title}`);
              const localPath = await this.downloader.downloadVideo(video.id, video.title);
              if (localPath) {
                this.db.updateVideoLocalPath(video.id, localPath);
                videosDownloaded++;
              }
            } catch (error: any) {
              console.error(`  - Error downloading: ${error.message}`);
            }
          }

          console.log(`✓ Downloaded ${videosDownloaded} videos`);
        } else {
          console.log('All videos already downloaded');
        }
      }

      this.db.updateSyncStatus(syncId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        videosAdded,
        videosUpdated,
        commentsAdded
      });

      console.log('\nIncremental sync completed!');
      console.log(`- New videos: ${videosAdded}`);
      console.log(`- Videos updated: ${videosUpdated}`);
      console.log(`- New comments: ${commentsAdded}`);
      if (shouldDownloadVideos) {
        console.log(`- Videos downloaded: ${videosDownloaded}`);
      }
    } catch (error: any) {
      console.error('Incremental sync failed:', error);
      this.db.updateSyncStatus(syncId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error.message
      });
      throw error;
    }
  }
}
