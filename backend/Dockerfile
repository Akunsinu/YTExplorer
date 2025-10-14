FROM node:20-alpine

# Install Python and yt-dlp dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose backend port
EXPOSE 3001

# Create directory for downloads and database
RUN mkdir -p /data/downloads /data/db

# Start the application
CMD ["node", "dist/index.js"]
