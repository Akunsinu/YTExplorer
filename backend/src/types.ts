export interface Video {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  localPath?: string;
  downloadedAt?: string;
  lastUpdated: string;
}

export interface Comment {
  id: string;
  videoId: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  authorChannelId: string;
  textDisplay: string;
  textOriginal: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  parentId?: string;
  totalReplyCount: number;
}

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  lastSynced: string;
}

export interface SyncStatus {
  id: number;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  videosAdded: number;
  videosUpdated: number;
  commentsAdded: number;
  error?: string;
}
