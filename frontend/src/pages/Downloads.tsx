import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadsApi } from '../api';
import { Link } from 'react-router-dom';

export default function Downloads() {
  const queryClient = useQueryClient();

  const { data: downloads, isLoading } = useQuery({
    queryKey: ['downloads'],
    queryFn: () => downloadsApi.getAll(),
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  const clearMutation = useMutation({
    mutationFn: () => downloadsApi.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'downloading': return 'text-blue-500';
      case 'failed': return 'text-red-500';
      case 'queued': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'downloading': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      case 'queued': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

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

  const downloading = downloads?.filter(d => d.status === 'downloading') || [];
  const queued = downloads?.filter(d => d.status === 'queued') || [];
  const completed = downloads?.filter(d => d.status === 'completed') || [];
  const failed = downloads?.filter(d => d.status === 'failed') || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Download Status</h1>
          <p className="text-gray-400 mt-2">
            Track your offline video downloads
          </p>
        </div>
        {downloads && downloads.length > 0 && (
          <button
            onClick={() => clearMutation.mutate()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Clear Completed
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Downloading</div>
          <div className="text-3xl font-bold text-blue-500">{downloading.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Queued</div>
          <div className="text-3xl font-bold text-yellow-500">{queued.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Completed</div>
          <div className="text-3xl font-bold text-green-500">{completed.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Failed</div>
          <div className="text-3xl font-bold text-red-500">{failed.length}</div>
        </div>
      </div>

      {!downloads || downloads.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No downloads in progress</h3>
          <p className="text-gray-500 mb-4">Start downloading videos to see progress here</p>
          <Link to="/" className="text-red-500 hover:underline">
            Go to Videos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Currently Downloading */}
          {downloading.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading ({downloading.length})
              </h2>
              <div className="space-y-3">
                {downloading.map(download => (
                  <div key={download.videoId} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        to={`/video/${download.videoId}`}
                        className="font-medium hover:text-red-500 flex-1"
                      >
                        {download.title}
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(download.status)}`}>
                        {download.status}
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queued */}
          {queued.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Queued ({queued.length})</h2>
              <div className="space-y-2">
                {queued.map(download => (
                  <div key={download.videoId} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                    <Link
                      to={`/video/${download.videoId}`}
                      className="font-medium hover:text-red-500"
                    >
                      {download.title}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(download.status)}`}>
                      {download.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completed ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map(download => (
                  <div key={download.videoId} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                    <Link
                      to={`/video/${download.videoId}`}
                      className="font-medium hover:text-red-500"
                    >
                      {download.title}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(download.status)}`}>
                      ✓ {download.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed */}
          {failed.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-red-500/30">
              <h2 className="text-xl font-bold mb-4 flex items-center text-red-500">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Failed ({failed.length})
              </h2>
              <div className="space-y-3">
                {failed.map(download => (
                  <div key={download.videoId} className="bg-red-500/10 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        to={`/video/${download.videoId}`}
                        className="font-medium hover:text-red-400 flex-1"
                      >
                        {download.title}
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(download.status)}`}>
                        {download.status}
                      </span>
                    </div>
                    {download.error && (
                      <p className="text-sm text-red-400 mt-2">Error: {download.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
