import Database from 'better-sqlite3';
import { Video, Comment, ChannelInfo, SyncStatus } from './types.js';
import path from 'path';

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS channel_info (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        custom_url TEXT,
        published_at TEXT NOT NULL,
        thumbnail_url TEXT,
        subscriber_count INTEGER,
        video_count INTEGER,
        view_count INTEGER,
        last_synced TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        published_at TEXT NOT NULL,
        thumbnail_url TEXT,
        duration TEXT,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        tags TEXT,
        local_path TEXT,
        downloaded_at TEXT,
        last_updated TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        author_display_name TEXT NOT NULL,
        author_profile_image_url TEXT,
        author_channel_id TEXT,
        text_display TEXT NOT NULL,
        text_original TEXT NOT NULL,
        like_count INTEGER DEFAULT 0,
        published_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        parent_id TEXT,
        total_reply_count INTEGER DEFAULT 0,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
        videos_added INTEGER DEFAULT 0,
        videos_updated INTEGER DEFAULT 0,
        comments_added INTEGER DEFAULT 0,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);

      -- Full-text search tables
      CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
        id UNINDEXED,
        title,
        description,
        tags,
        content='videos',
        content_rowid='rowid'
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS comments_fts USING fts5(
        id UNINDEXED,
        video_id UNINDEXED,
        author_display_name,
        text_display,
        text_original,
        content='comments',
        content_rowid='rowid'
      );

      -- Triggers to keep FTS tables in sync
      CREATE TRIGGER IF NOT EXISTS videos_ai AFTER INSERT ON videos BEGIN
        INSERT INTO videos_fts(rowid, id, title, description, tags)
        VALUES (new.rowid, new.id, new.title, new.description, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS videos_ad AFTER DELETE ON videos BEGIN
        DELETE FROM videos_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS videos_au AFTER UPDATE ON videos BEGIN
        DELETE FROM videos_fts WHERE rowid = old.rowid;
        INSERT INTO videos_fts(rowid, id, title, description, tags)
        VALUES (new.rowid, new.id, new.title, new.description, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS comments_ai AFTER INSERT ON comments BEGIN
        INSERT INTO comments_fts(rowid, id, video_id, author_display_name, text_display, text_original)
        VALUES (new.rowid, new.id, new.video_id, new.author_display_name, new.text_display, new.text_original);
      END;

      CREATE TRIGGER IF NOT EXISTS comments_ad AFTER DELETE ON comments BEGIN
        DELETE FROM comments_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS comments_au AFTER UPDATE ON comments BEGIN
        DELETE FROM comments_fts WHERE rowid = old.rowid;
        INSERT INTO comments_fts(rowid, id, video_id, author_display_name, text_display, text_original)
        VALUES (new.rowid, new.id, new.video_id, new.author_display_name, new.text_display, new.text_original);
      END;
    `);
  }

  // Channel operations
  upsertChannelInfo(channel: ChannelInfo) {
    const stmt = this.db.prepare(`
      INSERT INTO channel_info (id, title, description, custom_url, published_at, thumbnail_url, subscriber_count, video_count, view_count, last_synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        custom_url = excluded.custom_url,
        thumbnail_url = excluded.thumbnail_url,
        subscriber_count = excluded.subscriber_count,
        video_count = excluded.video_count,
        view_count = excluded.view_count,
        last_synced = excluded.last_synced
    `);

    stmt.run(
      channel.id,
      channel.title,
      channel.description,
      channel.customUrl,
      channel.publishedAt,
      channel.thumbnailUrl,
      channel.subscriberCount,
      channel.videoCount,
      channel.viewCount,
      channel.lastSynced
    );
  }

  getChannelInfo(): ChannelInfo | undefined {
    const row = this.db.prepare('SELECT * FROM channel_info LIMIT 1').get() as any;
    if (!row) return undefined;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      customUrl: row.custom_url,
      publishedAt: row.published_at,
      thumbnailUrl: row.thumbnail_url,
      subscriberCount: row.subscriber_count,
      videoCount: row.video_count,
      viewCount: row.view_count,
      lastSynced: row.last_synced
    };
  }

  // Video operations
  upsertVideo(video: Video): { isNew: boolean } {
    const existing = this.db.prepare('SELECT id FROM videos WHERE id = ?').get(video.id);

    const stmt = this.db.prepare(`
      INSERT INTO videos (id, title, description, published_at, thumbnail_url, duration, view_count, like_count, comment_count, tags, local_path, downloaded_at, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        thumbnail_url = excluded.thumbnail_url,
        duration = excluded.duration,
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        comment_count = excluded.comment_count,
        tags = excluded.tags,
        last_updated = excluded.last_updated
    `);

    stmt.run(
      video.id,
      video.title,
      video.description,
      video.publishedAt,
      video.thumbnailUrl,
      video.duration,
      video.viewCount,
      video.likeCount,
      video.commentCount,
      JSON.stringify(video.tags),
      video.localPath,
      video.downloadedAt,
      video.lastUpdated
    );

    return { isNew: !existing };
  }

  getVideo(id: string): Video | undefined {
    const row = this.db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;
    return row ? this.rowToVideo(row) : undefined;
  }

  getAllVideos(limit?: number, offset?: number): Video[] {
    let query = 'SELECT * FROM videos ORDER BY published_at DESC';
    if (limit) {
      query += ` LIMIT ${limit}`;
      if (offset) query += ` OFFSET ${offset}`;
    }
    const rows = this.db.prepare(query).all() as any[];
    return rows.map(row => this.rowToVideo(row));
  }

  getVideosCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM videos').get() as any;
    return result.count;
  }

  updateVideoLocalPath(videoId: string, localPath: string): void {
    this.db.prepare(`
      UPDATE videos
      SET local_path = ?, downloaded_at = ?
      WHERE id = ?
    `).run(localPath, new Date().toISOString(), videoId);
  }

  getVideosWithoutDownloads(limit?: number): Video[] {
    let query = 'SELECT * FROM videos WHERE local_path IS NULL OR local_path = \'\' ORDER BY published_at DESC';
    if (limit) query += ` LIMIT ${limit}`;
    const rows = this.db.prepare(query).all() as any[];
    return rows.map(row => this.rowToVideo(row));
  }

  // Comment operations
  upsertComment(comment: Comment): { isNew: boolean } {
    const existing = this.db.prepare('SELECT id FROM comments WHERE id = ?').get(comment.id);

    const stmt = this.db.prepare(`
      INSERT INTO comments (id, video_id, author_display_name, author_profile_image_url, author_channel_id, text_display, text_original, like_count, published_at, updated_at, parent_id, total_reply_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        text_display = excluded.text_display,
        text_original = excluded.text_original,
        like_count = excluded.like_count,
        updated_at = excluded.updated_at,
        total_reply_count = excluded.total_reply_count
    `);

    stmt.run(
      comment.id,
      comment.videoId,
      comment.authorDisplayName,
      comment.authorProfileImageUrl,
      comment.authorChannelId,
      comment.textDisplay,
      comment.textOriginal,
      comment.likeCount,
      comment.publishedAt,
      comment.updatedAt,
      comment.parentId,
      comment.totalReplyCount
    );

    return { isNew: !existing };
  }

  getCommentsByVideo(videoId: string, limit?: number): Comment[] {
    let query = 'SELECT * FROM comments WHERE video_id = ? ORDER BY published_at DESC';
    if (limit) query += ` LIMIT ${limit}`;
    const rows = this.db.prepare(query).all(videoId) as any[];
    return rows.map(row => this.rowToComment(row));
  }

  // Search operations
  searchVideos(query: string, limit = 50): Video[] {
    const rows = this.db.prepare(`
      SELECT v.* FROM videos v
      JOIN videos_fts fts ON v.rowid = fts.rowid
      WHERE videos_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as any[];
    return rows.map(row => this.rowToVideo(row));
  }

  searchComments(query: string, limit = 100): Comment[] {
    const rows = this.db.prepare(`
      SELECT c.* FROM comments c
      JOIN comments_fts fts ON c.rowid = fts.rowid
      WHERE comments_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as any[];
    return rows.map(row => this.rowToComment(row));
  }

  // Sync status operations
  createSyncStatus(): number {
    const result = this.db.prepare(`
      INSERT INTO sync_status (started_at, status)
      VALUES (?, 'running')
    `).run(new Date().toISOString());
    return result.lastInsertRowid as number;
  }

  updateSyncStatus(id: number, updates: Partial<SyncStatus>) {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.videosAdded !== undefined) {
      fields.push('videos_added = ?');
      values.push(updates.videosAdded);
    }
    if (updates.videosUpdated !== undefined) {
      fields.push('videos_updated = ?');
      values.push(updates.videosUpdated);
    }
    if (updates.commentsAdded !== undefined) {
      fields.push('comments_added = ?');
      values.push(updates.commentsAdded);
    }
    if (updates.error) {
      fields.push('error = ?');
      values.push(updates.error);
    }

    if (fields.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE sync_status SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
  }

  getLatestSync(): SyncStatus | undefined {
    const row = this.db.prepare('SELECT * FROM sync_status ORDER BY started_at DESC LIMIT 1').get() as any;
    return row ? this.rowToSyncStatus(row) : undefined;
  }

  // Helper methods
  private rowToVideo(row: any): Video {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      publishedAt: row.published_at,
      thumbnailUrl: row.thumbnail_url,
      duration: row.duration,
      viewCount: row.view_count,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      tags: row.tags ? JSON.parse(row.tags) : [],
      localPath: row.local_path,
      downloadedAt: row.downloaded_at,
      lastUpdated: row.last_updated
    };
  }

  private rowToComment(row: any): Comment {
    return {
      id: row.id,
      videoId: row.video_id,
      authorDisplayName: row.author_display_name,
      authorProfileImageUrl: row.author_profile_image_url,
      authorChannelId: row.author_channel_id,
      textDisplay: row.text_display,
      textOriginal: row.text_original,
      likeCount: row.like_count,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      parentId: row.parent_id,
      totalReplyCount: row.total_reply_count
    };
  }

  private rowToSyncStatus(row: any): SyncStatus {
    return {
      id: row.id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      videosAdded: row.videos_added,
      videosUpdated: row.videos_updated,
      commentsAdded: row.comments_added,
      error: row.error
    };
  }

  close() {
    this.db.close();
  }
}
