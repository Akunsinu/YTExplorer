import { useQuery } from '@tanstack/react-query';
import { videosApi } from '../api';
import VideoCard from '../components/VideoCard';
import { useState } from 'react';

export default function Home() {
  const [page, setPage] = useState(0);
  const pageSize = 24;

  const { data, isLoading, error } = useQuery({
    queryKey: ['videos', page],
    queryFn: () => videosApi.getAll(pageSize, page * pageSize)
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-xl mb-4">Error loading videos</div>
        <div className="text-gray-400">
          {(error as Error).message || 'Please try again later'}
        </div>
        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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

  if (!data || data.videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-xl">No videos found</div>
        <div className="text-gray-500 mt-2">Start by running a sync to fetch your channel data</div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Videos</h1>
        <p className="text-gray-400 mt-2">
          {data.total.toLocaleString()} videos total
        </p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center space-x-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
