import { google, youtube_v3 } from 'googleapis';
import { Video, Comment, ChannelInfo } from './types.js';

export class YouTubeService {
  private youtube: youtube_v3.Youtube;

  constructor(apiKey: string) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [channelId]
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error('Channel not found');
    }

    return {
      id: channel.id!,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      customUrl: channel.snippet?.customUrl,
      publishedAt: channel.snippet?.publishedAt || '',
      thumbnailUrl: channel.snippet?.thumbnails?.high?.url || '',
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      lastSynced: new Date().toISOString()
    };
  }

  async *getAllChannelVideos(channelId: string): AsyncGenerator<Video[]> {
    let pageToken: string | undefined;
    const now = new Date().toISOString();

    do {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId,
        maxResults: 50,
        order: 'date',
        type: ['video'],
        pageToken
      });

      const videoIds = response.data.items?.map(item => item.id?.videoId).filter(Boolean) as string[];

      if (videoIds.length > 0) {
        const videos = await this.getVideoDetails(videoIds, now);
        yield videos;
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  async getVideoDetails(videoIds: string[], timestamp: string): Promise<Video[]> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: videoIds
    });

    return (response.data.items || []).map(video => ({
      id: video.id!,
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      publishedAt: video.snippet?.publishedAt || '',
      thumbnailUrl: video.snippet?.thumbnails?.high?.url || '',
      duration: video.contentDetails?.duration || '',
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0'),
      commentCount: parseInt(video.statistics?.commentCount || '0'),
      tags: video.snippet?.tags || [],
      lastUpdated: timestamp
    }));
  }

  async *getAllVideoComments(videoId: string): AsyncGenerator<Comment[]> {
    let pageToken: string | undefined;

    try {
      do {
        const response = await this.youtube.commentThreads.list({
          part: ['snippet', 'replies'],
          videoId,
          maxResults: 100,
          pageToken,
          textFormat: 'plainText'
        });

        const comments: Comment[] = [];

        for (const thread of response.data.items || []) {
          const topComment = thread.snippet?.topLevelComment;
          if (topComment) {
            comments.push(this.parseComment(topComment, videoId));

            // Add replies
            if (thread.replies?.comments) {
              for (const reply of thread.replies.comments) {
                comments.push(this.parseComment(reply, videoId, topComment.id));
              }
            }
          }
        }

        if (comments.length > 0) {
          yield comments;
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);
    } catch (error: any) {
      // Comments might be disabled for this video
      if (error.code === 403 || error.message?.includes('disabled')) {
        console.log(`Comments disabled for video ${videoId}`);
        return;
      }
      throw error;
    }
  }

  private parseComment(comment: youtube_v3.Schema$Comment, videoId: string, parentId?: string): Comment {
    const snippet = comment.snippet!;
    return {
      id: comment.id!,
      videoId,
      authorDisplayName: snippet.authorDisplayName || '',
      authorProfileImageUrl: snippet.authorProfileImageUrl || '',
      authorChannelId: snippet.authorChannelId?.value || '',
      textDisplay: snippet.textDisplay || '',
      textOriginal: snippet.textOriginal || '',
      likeCount: snippet.likeCount || 0,
      publishedAt: snippet.publishedAt || '',
      updatedAt: snippet.updatedAt || '',
      parentId,
      totalReplyCount: 0
    };
  }

  async getUpdatedVideos(videoIds: string[]): Promise<Video[]> {
    const batchSize = 50;
    const allVideos: Video[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const videos = await this.getVideoDetails(batch, timestamp);
      allVideos.push(...videos);
    }

    return allVideos;
  }
}
