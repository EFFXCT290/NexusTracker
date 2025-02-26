import Comment from '../schema/comment';

/**
 * Deletes a comment by its ID.
 * Only administrators are allowed to delete comments.
 * Responds with appropriate status codes based on the outcome.
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    if (!req.userRole || req.userRole !== 'admin') {
      return res.status(403).send('Only administrators can delete comments');
    }

    const comment = await Comment.findByIdAndDelete(commentId);
    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    res.status(200).send('Comment deleted successfully');
  } catch (error) {
    res.status(500).send(`Error deleting comment: ${error.message}`);
  }
}; 