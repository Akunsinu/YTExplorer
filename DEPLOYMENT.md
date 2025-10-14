# Deploying YT Explorer on Unraid

This guide covers deploying YT Explorer on your Unraid server using Docker Compose.

## Prerequisites

- Unraid server with Docker support
- Docker Compose plugin installed (or use docker-compose command)
- YouTube Data API v3 key ([Get one here](https://console.cloud.google.com/apis/credentials))
- YouTube Channel ID you want to track

## Quick Start

### 1. Create Environment File

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
nano .env
```

Add your YouTube credentials:
```env
YOUTUBE_CHANNEL_ID=UCG9D682p5Fg5mJcZpqip62Q
YOUTUBE_API_KEY=your_actual_api_key_here
```

### 2. Deploy with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build both frontend and backend containers
- Start services on ports 3000 (frontend) and 3001 (backend)
- Create persistent volumes for data and downloads
- Set up automatic daily syncs at 2 AM

### 3. Access Your Application

- Frontend: `http://your-unraid-ip:3000`
- Backend API: `http://your-unraid-ip:3001`

## Unraid-Specific Setup

### Method 1: Docker Compose Manager (Recommended)

1. Install the "Docker Compose Manager" plugin from Community Applications
2. Navigate to Docker Compose Manager in Unraid
3. Create a new stack called "yt-explorer"
4. Copy your project folder to `/mnt/user/appdata/yt-explorer/`
5. Add the compose file from this project
6. Start the stack

### Method 2: Manual Docker Setup

If you prefer not to use Docker Compose:

1. Go to Docker tab in Unraid
2. Add Container for Backend:
   - Name: `yt-explorer-backend`
   - Repository: Build from `./backend/Dockerfile`
   - Port: `3001:3001`
   - Volume: `/mnt/user/appdata/yt-explorer/data:/data`
   - Environment Variables: Add your YouTube credentials

3. Add Container for Frontend:
   - Name: `yt-explorer-frontend`
   - Repository: Build from `./frontend/Dockerfile`
   - Port: `3000:80`

## Configuration

### Port Mapping

You can change the exposed ports in `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Frontend on port 8080 instead of 3000
  - "8081:3001"  # Backend on port 8081 instead of 3001
```

### Volume Mapping

Data is stored in named volumes by default. To map to specific Unraid paths:

```yaml
volumes:
  - /mnt/user/appdata/yt-explorer/data:/data
  - /mnt/user/media/youtube-downloads:/data/downloads
```

### Sync Schedule

Change the sync schedule in `docker-compose.yml`:

```yaml
environment:
  - SYNC_SCHEDULE=0 */6 * * *  # Every 6 hours instead of daily
```

## Management Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

## Troubleshooting

### Port Conflicts

If ports 3000 or 3001 are already in use:
1. Edit `docker-compose.yml`
2. Change the port mappings (left side only)
3. Restart: `docker-compose up -d`

### Database Issues

If you encounter database errors:
```bash
docker-compose exec backend sh
rm /data/db/yt-explorer.db
# Restart to recreate database
docker-compose restart backend
```

### Video Download Issues

Ensure yt-dlp is working:
```bash
docker-compose exec backend sh
yt-dlp --version
```

## Backup

Important paths to backup on Unraid:
- `/mnt/user/appdata/yt-explorer/` - Application data
- Database: In the `yt-data` volume or mapped path
- Downloads: In the `yt-downloads` volume or mapped path

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Security Notes

- The application is designed for local network use
- If exposing to the internet, use a reverse proxy (nginx, Caddy, etc.)
- Keep your `.env` file secure and never commit it to version control
- Regularly update the containers: `docker-compose pull && docker-compose up -d`

## Support

For issues specific to this deployment, check:
- Docker logs: `docker-compose logs`
- Unraid system logs: Settings > System Log
- Container stats: Docker tab in Unraid
