import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api';
import VideoCard from '../components/VideoCard';
import type { Comment } from '../types';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['searchVideos', query],
    queryFn: () => searchApi.videos(query),
    enabled: query.length > 0
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['searchComments', query],
    queryFn: () => searchApi.comments(query),
    enabled: query.length > 0
  });

  if (!query) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-xl">Enter a search query</div>
      </div>
    );
  }

  const isLoading = videosLoading || commentsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <svg className="animate-spin h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const highlightText = (text: string, query: string) => {
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500 text-gray-900 px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const CommentResult = ({ comment }: { comment: Comment }) => (
    <Link
      to={`/video/${comment.videoId}`}
      className="block bg-gray-800 rounded-lg p-4 hover:ring-2 hover:ring-red-500 transition"
    >
      <div className="flex items-start space-x-4">
        <img
          src={comment.authorProfileImageUrl}
          alt={comment.authorDisplayName}
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-gray-200">
              {comment.authorDisplayName}
            </span>
            <span className="text-gray-500 text-sm">
              {formatDate(comment.publishedAt)}
            </span>
          </div>
          <p className="text-gray-300 line-clamp-3">
            {highlightText(comment.textDisplay, query)}
          </p>
          {comment.likeCount > 0 && (
            <div className="flex items-center space-x-1 text-gray-400 text-sm mt-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              <span>{comment.likeCount}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  const totalResults = (videos?.length || 0) + (comments?.length || 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Search Results</h1>
        <p className="text-gray-400 mt-2">
          Found {totalResults} results for "{query}"
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-xl">No results found</div>
          <div className="text-gray-500 mt-2">Try a different search term</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Video Results */}
          {videos && videos.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">
                Videos ({videos.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </section>
          )}

          {/* Comment Results */}
          {comments && comments.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">
                Comments ({comments.length})
              </h2>
              <div className="space-y-4">
                {comments.slice(0, 20).map(comment => (
                  <CommentResult key={comment.id} comment={comment} />
                ))}
              </div>
              {comments.length > 20 && (
                <div className="text-center mt-6 text-gray-400">
                  Showing 20 of {comments.length} comments
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
