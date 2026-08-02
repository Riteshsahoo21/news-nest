import Comment from '../models/Comment.js';

// Delete a comment (Admin or comment author)
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const roles = req.user.roles || [];
    const isAdmin = roles.includes('admin');

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(id);

    res.json({ message: 'Comment deleted successfully', commentId: id });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Like a comment
export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From verifyToken

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex === -1) {
      comment.likes.push(userId); // Add like
    } else {
      comment.likes.splice(likeIndex, 1); // Remove like
    }

    comment.likesCount = comment.likes.length;
    await comment.save();

    // Broadcast the updated comment like count via Socket.io
    if (req.io && comment.newsId) {
      req.io.to(comment.newsId.toString()).emit('comment_liked', {
        commentId: comment._id,
        likesCount: comment.likesCount
      });
    }

    res.json({ message: 'Comment liked', likesCount: comment.likesCount });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
