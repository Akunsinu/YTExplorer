import axios from 'axios';
import type { Video, Comment, ChannelInfo, SyncStatus } from './types';

const api = axios.create({
  baseURL: '/api'
});

export const channelApi = {
  getInfo: () => api.get<ChannelInfo>('/channel').then(res => res.data)
};

export const videosApi = {
  getAll: (limit?: number, offset?: number) =>
    api.get<{ videos: Video[], total: number }>('/videos', { params: { limit, offset } }).then(res => res.data),
  getById: (id: string) => api.get<Video>(`/videos/${id}`).then(res => res.data),
  getComments: (id: string, limit?: number) =>
    api.get<Comment[]>(`/videos/${id}/comments`, { params: { limit } }).then(res => res.data),
  download: (id: string) => api.post(`/videos/${id}/download`).then(res => res.data),
  downloadAll: (limit?: number) => api.post('/videos/download-all', { limit }).then(res => res.data)
};

export const searchApi = {
  videos: (query: string, limit?: number) =>
    api.get<Video[]>('/search/videos', { params: { q: query, limit } }).then(res => res.data),
  comments: (query: string, limit?: number) =>
    api.get<Comment[]>('/search/comments', { params: { q: query, limit } }).then(res => res.data)
};

export const syncApi = {
  getStatus: () => api.get<SyncStatus>('/sync/status').then(res => res.data),
  start: (full: boolean = false) => api.post('/sync/start', { full }).then(res => res.data)
};
