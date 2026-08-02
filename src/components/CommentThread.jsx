import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, Trash2, Ban, MessageSquare, Send, UserCircle } from 'lucide-react';

export const buildCommentTree = (comments) => {
  const commentMap = {};
  const roots = [];

  // Initialize all comments with an empty children array
  comments.forEach(comment => {
    commentMap[comment._id] = { ...comment, children: [] };
  });

  // Populate the children array or push to roots
  comments.forEach(comment => {
    if (comment.parentCommentId) {
      if (commentMap[comment.parentCommentId]) {
        commentMap[comment.parentCommentId].children.push(commentMap[comment._id]);
      } else {
        // If parent is missing, treat as root
        roots.push(commentMap[comment._id]);
      }
    } else {
      roots.push(commentMap[comment._id]);
    }
  });

  return roots;
};

export default function CommentThread({ 
  comment, 
  onReplySubmit, 
  onLike, 
  onDelete, 
  onBan, 
  isStaff, 
  isAdmin,
  currentUser,
  depth = 0
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  
  const initialLiked = currentUser && comment.likes && comment.likes.includes(currentUser._id || currentUser.id);
  const [hasLiked, setHasLiked] = useState(initialLiked);
  const [animateLike, setAnimateLike] = useState(false);

  const handleLikeClick = () => {
    setHasLiked(!hasLiked); // Optimistic UI
    setAnimateLike(true);
    onLike(comment._id);
    setTimeout(() => setAnimateLike(false), 300);
  };

  const handleReplyClick = () => {
    if (!isReplying && depth > 0 && comment.userId?.fullName) {
      setReplyContent(`@${comment.userId.fullName} `);
    } else if (isReplying) {
      setReplyContent(''); // Clear if they cancel reply
    }
    setIsReplying(!isReplying);
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    onReplySubmit(replyContent, comment._id);
    setReplyContent('');
    setIsReplying(false);
  };

  // Indentation styling based on depth
  const indentClass = depth > 0 ? 'mt-2 border-l-2 border-border/30 pl-3 md:pl-4 ml-2 md:ml-4' : 'mt-4';

  return (
    <div className={`flex flex-col w-full ${indentClass}`}>
      <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {comment.userId ? (
              <Link to={`/user/${comment.userId._id}`} className="flex items-center space-x-2 group">
                {comment.userId.profilePicture ? (
                  <img src={comment.userId.profilePicture} alt={comment.userId.fullName} className="w-6 h-6 rounded-full object-cover group-hover:ring-2 ring-primary/50 transition-all" />
                ) : (
                  <UserCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {comment.userId.fullName}
                </span>
              </Link>
            ) : (
              <div className="flex items-center space-x-2">
                <UserCircle className="w-6 h-6 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">Anonymous</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center text-muted-foreground space-x-3">
            
            {(isAdmin || (currentUser && comment.userId?._id === currentUser._id)) && (
              <button
                onClick={() => onDelete(comment._id)}
                className="flex items-center space-x-1 text-red-500 hover:text-red-700 transition-colors"
                title="Delete Comment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {isAdmin && comment.userId?._id && comment.userId._id !== currentUser?._id && (
              <button
                onClick={() => onBan(comment.userId._id)}
                className="flex items-center space-x-1 text-orange-500 hover:text-orange-700 transition-colors"
                title="Ban User"
              >
                <Ban className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <p className="text-sm text-foreground/80">{comment.content}</p>
        
        <div className="flex items-center space-x-4 pt-1">
          <button 
            onClick={handleLikeClick}
            className={`flex items-center space-x-1.5 text-xs font-medium transition-colors ${
              hasLiked ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'
            }`}
          >
            <div className={`transition-transform duration-300 ease-out flex items-center justify-center ${animateLike ? 'scale-125' : 'scale-100'}`}>
              <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : 'fill-transparent'}`} />
            </div>
            <span>{comment.likesCount > 0 ? comment.likesCount : 'Like'}</span>
          </button>
          
          <button 
            onClick={handleReplyClick}
            className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>

        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 relative flex items-center">
            <input 
              type="text" 
              placeholder={`Reply to ${comment.userId?.fullName || 'user'}...`}
              className="w-full border border-border/80 rounded-full py-2 px-4 pr-10 focus:outline-none focus:ring-1 focus:ring-primary bg-background text-sm"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!replyContent.trim()}
              className="absolute right-2 p-1.5 text-primary disabled:opacity-50 hover:bg-muted rounded-full transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {comment.children && comment.children.length > 0 && (
        <div className="flex flex-col">
          {comment.children.map(childComment => (
            <CommentThread
              key={childComment._id}
              comment={childComment}
              onReplySubmit={onReplySubmit}
              onLike={onLike}
              onDelete={onDelete}
              onBan={onBan}
              isStaff={isStaff}
              isAdmin={isAdmin}
              currentUser={currentUser}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
