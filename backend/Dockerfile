FROM node:20-alpine

# Install Python and yt-dlp dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose backend port
EXPOSE 3001

# Create directory for downloads and database
RUN mkdir -p /data/downloads /data/db

# Start the application
CMD ["node", "dist/index.js"]
