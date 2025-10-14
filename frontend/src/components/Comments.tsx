import type { Comment } from '../types';

interface CommentsProps {
  comments: Comment[];
}

export default function Comments({ comments }: CommentsProps) {
  if (comments.length === 0) {
    return <div className="text-gray-400 text-center py-8">No comments yet</div>;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  // Separate top-level comments and replies
  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesMap = new Map<string, Comment[]>();

  comments.forEach(comment => {
    if (comment.parentId) {
      if (!repliesMap.has(comment.parentId)) {
        repliesMap.set(comment.parentId, []);
      }
      repliesMap.get(comment.parentId)!.push(comment);
    }
  });

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const replies = repliesMap.get(comment.id) || [];

    return (
      <div className={isReply ? 'ml-12 mt-4' : ''}>
        <div className="flex space-x-4">
          <img
            src={comment.authorProfileImageUrl}
            alt={comment.authorDisplayName}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-200">
                {comment.authorDisplayName}
              </span>
              <span className="text-gray-500 text-sm">
                {formatDate(comment.publishedAt)}
              </span>
            </div>

            <p className="text-gray-300 whitespace-pre-wrap mb-2">
              {comment.textDisplay}
            </p>

            {comment.likeCount > 0 && (
              <div className="flex items-center space-x-1 text-gray-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                <span>{comment.likeCount}</span>
              </div>
            )}

            {/* Render replies */}
            {replies.length > 0 && (
              <div className="mt-4 space-y-4">
                {replies.map(reply => (
                  <CommentItem key={reply.id} comment={reply} isReply={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {topLevelComments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
