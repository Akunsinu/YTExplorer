# Quick Start Guide

Get YT Explorer running in 5 minutes!

## Step 1: Get API Credentials (2 minutes)

### YouTube API Key
1. Visit https://console.cloud.google.com/
2. Create a project
3. Enable "YouTube Data API v3"
4. Create credentials → API key
5. Copy the API key

### Channel ID
1. Visit https://www.youtube.com/account_advanced
2. Copy your Channel ID

## Step 2: Setup (2 minutes)

```bash
# Install dependencies
npm install

# Create environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your credentials
# YOUTUBE_API_KEY=your_key_here
# CHANNEL_ID=your_channel_id_here
```

## Step 3: Run (1 minute)

```bash
# Start everything
npm run dev
```

Open http://localhost:3000

## Step 4: First Sync

Click "Full Sync" in the footer, or:

```bash
curl -X POST http://localhost:3001/api/sync/start \
  -H "Content-Type: application/json" \
  -d '{"full": true}'
```

**That's it!** Your videos and comments will start syncing.

## What's Syncing?

While syncing, you'll see progress in the backend terminal:
```
Starting full sync...
Fetching channel info...
Channel: Your Channel Name (123 videos)
Fetching videos...
Progress: 50 videos processed (50 new, 0 updated)
Fetching comments...
Fetching comments for video 1/123: Video Title
```

## After Sync Completes

- **Browse**: See all your videos on the home page
- **Search**: Use the search bar to find videos or comments
- **Watch**: Click any video to watch and read comments
- **Auto-Update**: Syncs automatically every day at 2 AM

## Common Issues

**"Channel not found"**: Run initial sync first

**"Quota exceeded"**: YouTube API limit reached, wait 24 hours

**Port in use**: Change PORT in backend/.env

## Next Steps

- Set up automatic backups of `backend/yt-explorer.db`
- Customize the sync schedule in `backend/src/index.ts`
- Add more channels (future feature)

Enjoy exploring your YouTube archive!
