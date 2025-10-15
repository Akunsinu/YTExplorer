import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { channelApi, syncApi } from '../api';
import { useState } from 'react';

export default function Layout() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: channel } = useQuery({
    queryKey: ['channel'],
    queryFn: channelApi.getInfo,
    retry: false
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['syncStatus'],
    queryFn: syncApi.getStatus,
    refetchInterval: 5000
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSync = async (full: boolean) => {
    if (confirm(`Start ${full ? 'full' : 'incremental'} sync?`)) {
      await syncApi.start(full);
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                <span className="text-xl font-bold">YT Explorer</span>
              </Link>

              {channel && (
                <div className="hidden md:block text-sm text-gray-400">
                  {channel.title} - {channel.videoCount.toLocaleString()} videos
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Downloads Link */}
              <Link
                to="/downloads"
                className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
                title="View download progress"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden md:inline text-sm">Downloads</span>
              </Link>

              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="bg-gray-700 text-gray-100 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </form>

              {/* Sync Status */}
              {syncStatus && (
                <div className="flex items-center space-x-2">
                  {syncStatus.isSyncing ? (
                    <div className="flex items-center space-x-2 text-yellow-500">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Syncing...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSync(false)}
                      className="text-sm text-gray-400 hover:text-gray-200"
                      title="Start incremental sync"
                    >
                      Sync Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              {syncStatus?.latestSync && (
                <span>
                  Last synced: {new Date(syncStatus.latestSync.startedAt).toLocaleString()}
                </span>
              )}
            </div>
            <div className="space-x-4">
              <button
                onClick={() => handleSync(false)}
                className="hover:text-gray-200"
              >
                Incremental Sync
              </button>
              <button
                onClick={() => handleSync(true)}
                className="hover:text-gray-200"
              >
                Full Sync
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
