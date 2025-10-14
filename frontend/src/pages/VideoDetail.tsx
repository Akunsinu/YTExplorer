import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videosApi } from '../api';
import Comments from '../components/Comments';
import { useState } from 'react';

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);

  const { data: video, isLoading: videoLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videosApi.getById(id!),
    enabled: !!id
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => videosApi.getComments(id!),
    enabled: !!id
  });

  const downloadMutation = useMutation({
    mutationFn: () => videosApi.download(id!),
    onSuccess: () => {
      setDownloading(true);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['video', id] });
        setDownloading(false);
      }, 5000);
    }
  });

  if (videoLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <svg className="animate-spin h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-xl mb-4">Video not found</div>
        <Link to="/" className="text-red-500 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center text-gray-400 hover:text-gray-200 mb-6">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to videos
      </Link>

      {/* Video Player */}
      <div className="bg-gray-800 rounded-lg overflow-hidden mb-6 relative">
        <div className="aspect-video bg-black flex items-center justify-center">
          {video.localPath ? (
            <video
              className="w-full h-full"
              controls
              preload="metadata"
            >
              <source src={`http://localhost:3001/${video.localPath}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${video.id}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* Download Button */}
        {!video.localPath && (
          <div className="absolute top-4 right-4">
            <button
              onClick={() => downloadMutation.mutate()}
              disabled={downloading || downloadMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading || downloadMutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download for Offline</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Downloaded Badge */}
        {video.localPath && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Downloaded</span>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">{video.title}</h1>

        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700">
          <div className="text-gray-400">
            {formatDate(video.publishedAt)}
          </div>

          <div className="flex items-center space-x-6 text-gray-400">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span>{video.viewCount.toLocaleString()} views</span>
            </div>

            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              <span>{video.likeCount.toLocaleString()} likes</span>
            </div>

            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span>{video.commentCount.toLocaleString()} comments</span>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-gray-300">{video.description}</p>
        </div>

        {video.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex flex-wrap gap-2">
              {video.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">
          Comments {comments && `(${comments.length})`}
        </h2>
        {commentsLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <Comments comments={comments || []} />
        )}
      </div>
    </div>
  );
}
