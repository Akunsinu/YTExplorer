import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { DatabaseService } from './database.js';
import { YouTubeService } from './youtube.js';
import { SyncService } from './sync.js';
import { VideoDownloader } from './downloader.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize services
const dbPath = process.env.DATABASE_PATH || './yt-explorer.db';
const downloadsPath = process.env.DOWNLOADS_PATH || './downloads';
const db = new DatabaseService(dbPath);
const youtube = new YouTubeService(process.env.YOUTUBE_API_KEY!);
const downloader = new VideoDownloader(downloadsPath);
const channelId = process.env.YOUTUBE_CHANNEL_ID!;
const syncService = new SyncService(db, youtube, channelId, downloader);

// Track sync status
let isSyncing = false;

// Middleware
app.use(cors());
app.use(express.json());

// Serve downloaded videos
app.use('/downloads', express.static(downloadsPath));

// API Routes

// Get channel info
app.get('/api/channel', (req, res) => {
  try {
    const channel = db.getChannelInfo();
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found. Please run initial sync.' });
    }
    res.json(channel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all videos
app.get('/api/videos', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    const videos = db.getAllVideos(limit, offset);
    const total = db.getVideosCount();
    res.json({ videos, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single video
app.get('/api/videos/:id', (req, res) => {
  try {
    const video = db.getVideo(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json(video);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a video
app.get('/api/videos/:id/comments', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const comments = db.getCommentsByVideo(req.params.id, limit);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export comments as CSV
app.get('/api/videos/:id/comments/export', (req, res) => {
  try {
    const comments = db.getCommentsByVideo(req.params.id);
    const video = db.getVideo(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Create CSV header
    const csvRows = [
      ['Author', 'Comment', 'Likes', 'Published Date', 'Is Reply', 'Parent Comment ID'].join(',')
    ];

    // Add comment rows
    comments.forEach(comment => {
      const row = [
        `"${comment.authorDisplayName.replace(/"/g, '""')}"`,
        `"${comment.textOriginal.replace(/"/g, '""')}"`,
        comment.likeCount,
        comment.publishedAt,
        comment.parentId ? 'Yes' : 'No',
        comment.parentId || ''
      ].join(',');
      csvRows.push(row);
    });

    const csv = csvRows.join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${video.title.replace(/[^a-z0-9]/gi, '_')}_comments.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search videos
app.get('/api/search/videos', (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const videos = db.searchVideos(query, limit);
    res.json(videos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search comments
app.get('/api/search/comments', (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const comments = db.searchComments(query, limit);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
app.get('/api/sync/status', (req, res) => {
  try {
    const latestSync = db.getLatestSync();
    res.json({
      isSyncing,
      latestSync
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger manual sync
app.post('/api/sync/start', async (req, res) => {
  if (isSyncing) {
    return res.status(409).json({ error: 'Sync already in progress' });
  }

  const fullSync = req.body.full === true;

  res.json({ message: 'Sync started', type: fullSync ? 'full' : 'incremental' });

  // Run sync in background
  isSyncing = true;
  try {
    if (fullSync) {
      await syncService.performFullSync();
    } else {
      await syncService.performIncrementalSync();
    }
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    isSyncing = false;
  }
});

// Download a specific video
app.post('/api/videos/:id/download', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = db.getVideo(videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if already downloaded
    if (video.localPath) {
      return res.json({ message: 'Video already downloaded', localPath: video.localPath });
    }

    res.json({ message: 'Download started', videoId });

    // Download in background
    const localPath = await downloader.downloadVideo(videoId, video.title);
    if (localPath) {
      db.updateVideoLocalPath(videoId, localPath);
      console.log(`✓ Video downloaded and saved: ${video.title}`);
    }
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download all videos
app.post('/api/videos/download-all', async (req, res) => {
  const limit = req.body.limit ? parseInt(req.body.limit) : undefined;

  res.json({ message: 'Batch download started' });

  // Download in background
  const videos = db.getVideosWithoutDownloads(limit);
  console.log(`Starting batch download of ${videos.length} videos...`);

  for (const video of videos) {
    try {
      const localPath = await downloader.downloadVideo(video.id, video.title);
      if (localPath) {
        db.updateVideoLocalPath(video.id, localPath);
      }
    } catch (error: any) {
      console.error(`Failed to download ${video.title}:`, error.message);
    }
  }

  console.log('Batch download completed');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`\n🚀 YT Explorer Backend running on http://localhost:${port}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`📺 Channel ID: ${channelId}\n`);

  // Check if this is first run
  const channelInfo = db.getChannelInfo();
  if (!channelInfo) {
    console.log('⚠️  No channel data found. Please run initial sync:');
    console.log('   POST http://localhost:' + port + '/api/sync/start');
    console.log('   with body: { "full": true }\n');
  }
});

// Schedule automatic sync every 24 hours (at 2 AM)
cron.schedule('0 2 * * *', async () => {
  if (isSyncing) {
    console.log('Scheduled sync skipped - sync already in progress');
    return;
  }

  console.log('\n⏰ Starting scheduled incremental sync...');
  isSyncing = true;
  try {
    await syncService.performIncrementalSync();
  } catch (error) {
    console.error('Scheduled sync error:', error);
  } finally {
    isSyncing = false;
  }
});

console.log('⏰ Scheduled sync: Every day at 2:00 AM');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  db.close();
  process.exit(0);
});
