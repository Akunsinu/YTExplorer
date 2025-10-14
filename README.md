# YT Explorer

A comprehensive YouTube channel archival and exploration tool that downloads your channel's videos, comments, likes, and metadata into a searchable local database with automatic daily updates.

## Features

- **Complete Channel Archive**: Downloads all videos, comments, and metadata from your YouTube channel
- **Offline Video Playback**: Download videos locally for true offline viewing with native HTML5 video player
- **Auto-Updating Database**: Automatically syncs every 24 hours to keep your archive current
- **Full-Text Search**: Powerful search across video titles, descriptions, tags, and comments using SQLite FTS5
- **Modern UI**: Polished React interface with TailwindCSS
- **Dual Video Player**: Watch via YouTube embed or local file (when downloaded)
- **Comments Viewer**: Browse all comments with threading support
- **Statistics**: View counts, likes, and comment counts for all videos
- **Download Management**: Download individual videos or batch download your entire channel
- **API**: RESTful API for programmatic access to your archive

## Architecture

**Backend:**
- Node.js + TypeScript + Express
- SQLite with FTS5 (full-text search)
- YouTube Data API v3
- yt-dlp (video downloads)
- node-cron (scheduling)

**Frontend:**
- React + TypeScript + Vite
- TailwindCSS
- React Query (data fetching)
- React Router (navigation)

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- YouTube Data API key
- yt-dlp (for downloading videos - install with `brew install yt-dlp` on macOS)

## Setup Instructions

### 1. Get Your YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the YouTube Data API v3
4. Go to Credentials and create an API key
5. Copy your API key

### 2. Find Your Channel ID

1. Go to [YouTube Advanced Settings](https://www.youtube.com/account_advanced)
2. Your Channel ID is shown under "Channel ID"
3. Copy your Channel ID

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
npm install --workspace=backend

# Install frontend dependencies
npm install --workspace=frontend
```

### 4. Configure Environment

Create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your credentials:

```env
YOUTUBE_API_KEY=your_api_key_here
CHANNEL_ID=your_channel_id_here
PORT=3001
DATABASE_PATH=./yt-explorer.db
```

## Running the Application

### Development Mode

Run both backend and frontend concurrently:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Mode

```bash
# Build both frontend and backend
npm run build

# Start the backend server
npm start
```

For production, you'll need to serve the frontend build separately or configure the backend to serve static files.

## First Time Setup

After starting the application for the first time:

1. Open your browser to http://localhost:3000
2. Click "Full Sync" in the footer or use the API:

```bash
curl -X POST http://localhost:3001/api/sync/start \
  -H "Content-Type: application/json" \
  -d '{"full": true}'
```

This will:
- Fetch all channel information
- Download all video metadata
- Fetch all comments for each video
- Create searchable database indexes

**Note**: Initial sync can take a while depending on:
- Number of videos in your channel
- Number of comments per video
- YouTube API rate limits

## Usage

### Web Interface

**Home Page**: Browse all videos in a grid layout with pagination

**Video Detail**: Click any video to:
- Watch the video (YouTube embed or local file)
- Download for offline viewing (click "Download for Offline" button)
- Read the description
- View all comments (with replies)
- See statistics (views, likes, comments)

**Search**: Use the search bar to find:
- Videos by title, description, or tags
- Comments by content or author

**Download Controls**:
- **Individual Download**: Click "Download for Offline" button on any video
- **Batch Download**: Use API to download multiple videos (see API section)

**Sync Controls**:
- **Incremental Sync**: Updates existing videos and fetches new ones
- **Full Sync**: Re-downloads everything from scratch

**Offline Indicator**: Videos with a green "Offline" badge are downloaded and can be watched without internet

### API Endpoints

**Channel Info**
```
GET /api/channel
```

**Videos**
```
GET /api/videos?limit=24&offset=0
GET /api/videos/:id
GET /api/videos/:id/comments
```

**Search**
```
GET /api/search/videos?q=query&limit=50
GET /api/search/comments?q=query&limit=100
```

**Sync**
```
GET /api/sync/status
POST /api/sync/start
Body: { "full": true } // or false for incremental
```

**Video Downloads**
```
POST /api/videos/:id/download
# Download a specific video for offline viewing

POST /api/videos/download-all
Body: { "limit": 10 } // optional: limit number of videos to download
# Batch download all videos that haven't been downloaded yet
```

## Automatic Updates

The application automatically runs an incremental sync every day at 2:00 AM. This will:
- Check for new videos
- Update statistics for existing videos
- Fetch comments for new videos

You can change the schedule in `backend/src/index.ts`:

```typescript
// Change '0 2 * * *' to your preferred cron schedule
cron.schedule('0 2 * * *', async () => {
  // sync logic
});
```

## Database Schema

The SQLite database includes:

**Tables:**
- `channel_info` - Channel metadata
- `videos` - Video information
- `comments` - Comments and replies
- `sync_status` - Sync history

**FTS5 Tables:**
- `videos_fts` - Full-text search for videos
- `comments_fts` - Full-text search for comments

## Search Syntax

YT Explorer uses SQLite FTS5 for search. Supported syntax:

- `"exact phrase"` - Search for exact phrase
- `word1 AND word2` - Both words must be present
- `word1 OR word2` - Either word must be present
- `word1 NOT word2` - First word but not second
- `word*` - Prefix search

Examples:
- `"machine learning"` - Videos/comments with exact phrase
- `tutorial AND python` - Must contain both words
- `react*` - Matches react, reactive, reactjs, etc.

## Troubleshooting

**Quota Exceeded Error**: YouTube API has daily quotas. If exceeded, wait 24 hours or create additional API keys.

**Comments Not Loading**: Some videos have comments disabled. The sync will skip these videos.

**Sync Taking Too Long**: For channels with many videos:
- Initial sync can take hours
- Consider running overnight
- Check `sync_status` table for progress

**Port Already in Use**: Change PORT in `.env` file

## Future Enhancements

Potential additions:
- Download actual video files for true offline viewing (using yt-dlp)
- Export data to JSON/CSV
- Analytics dashboard
- Video thumbnails caching
- Multi-channel support
- Comment sentiment analysis

## License

MIT License - feel free to use and modify as needed.

## API Rate Limits

YouTube Data API v3 has quotas:
- Default: 10,000 units per day
- Video list: 1 unit
- Comment threads: 1 unit
- Search: 100 units

A channel with 100 videos and 10,000 comments will use approximately:
- Videos: ~200 units
- Comments: ~100 units
- Total: ~300 units

This leaves plenty of headroom for daily updates.
