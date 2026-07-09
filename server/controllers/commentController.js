import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationService.js';
import { logActivity } from '../utils/activityLogger.js';

/**
 * @desc    Create a new comment or threaded reply
 * @route   POST /api/comments/:documentId
 * @access  Private
 */
export const createComment = async (req, res, next) => {
  try {
    const documentId = req.params.documentId;
    const { content, parentComment } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      res.status(400);
      return next(new Error('Comment content is required'));
    }

    const document = req.document; // Populated by requireDocumentAccess

    // 1. Viewer comment authorization check
    if (req.docPermission === 'read' && !document.allowViewerComments) {
      res.status(403);
      return next(new Error('Access Denied: Viewers are not permitted to comment on this document'));
    }

    // 2. Mentions Parsing
    const mentionRegex = /@([^\s@]+)/g;
    const matches = [...content.matchAll(mentionRegex)].map(m => m[1]);
    const mentionIds = [];

    for (const token of matches) {
      // Find matching user by email or starting of full name
      const user = await User.findOne({
        $or: [
          { email: token.toLowerCase() },
          { fullName: { $regex: new RegExp('^' + token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') } }
        ]
      });

      if (user && !mentionIds.includes(user._id.toString())) {
        mentionIds.push(user._id);

        // Notify mentioned user if preference enables it
        if (user.notificationPreferences?.mentions !== false) {
          await createNotification({
            user: user._id,
            type: NOTIFICATION_TYPES.MENTION,
            title: 'New Mention',
            message: `${req.user.fullName} mentioned you in a comment in "${document.title || 'Untitled Document'}"`,
            link: `/workspace/${document.workspace}/document/${document._id}`
          });
        }
      }
    }

    // 3. Create Comment Document
    const comment = await Comment.create({
      document: documentId,
      author: userId,
      parentComment: parentComment || null,
      content: content.trim(),
      mentions: mentionIds
    });

    // Log Activity Feed
    await logActivity({
      workspace: document.workspace,
      document: documentId,
      user: userId,
      type: 'COMMENT_CREATED',
      details: { commentId: comment._id, content: comment.content.substring(0, 40), isReply: !!parentComment }
    });

    // 4. Threaded reply notifications
    if (parentComment) {
      const parent = await Comment.findById(parentComment).populate('author');
      if (parent && parent.author && parent.author._id.toString() !== userId.toString()) {
        const parentUser = parent.author;
        if (parentUser.notificationPreferences?.mentions !== false) {
          await createNotification({
            user: parentUser._id,
            type: NOTIFICATION_TYPES.COMMENT_REPLY,
            title: 'New Thread Reply',
            message: `${req.user.fullName} replied to your comment in "${document.title || 'Untitled Document'}"`,
            link: `/workspace/${document.workspace}/document/${document._id}`
          });
        }
      }
    }

    // Populate author details to send back
    const populated = await comment.populate('author', 'fullName email avatarUrl');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comments list for a document (threaded, paginated)
 * @route   GET /api/comments/:documentId
 * @access  Private
 */
export const getDocumentComments = async (req, res, next) => {
  try {
    const documentId = req.params.documentId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // default large limit for nested threads
    const skip = (page - 1) * limit;

    const total = await Comment.countDocuments({ document: documentId });
    const comments = await Comment.find({ document: documentId })
      .populate('author', 'fullName email avatarUrl')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // Apply soft-delete content mask in response
    const sanitizedComments = comments.map(c => {
      const plainObj = c.toObject();
      if (plainObj.isDeleted) {
        plainObj.content = 'This comment was deleted.';
      }
      return plainObj;
    });

    res.status(200).json({
      success: true,
      data: sanitizedComments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a comment content (Author only)
 * @route   PATCH /api/comments/:commentId
 * @access  Private
 */
export const updateComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      res.status(400);
      return next(new Error('Content is required to update a comment'));
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404);
      return next(new Error('Comment not found'));
    }

    if (comment.author.toString() !== userId.toString()) {
      res.status(403);
      return next(new Error('Access Denied: Only the author can edit this comment'));
    }

    comment.content = content.trim();
    await comment.save();

    const populated = await comment.populate('author', 'fullName email avatarUrl');

    res.status(200).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft-delete a comment (Author / Admin / Owner)
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
export const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404);
      return next(new Error('Comment not found'));
    }

    // Determine authorization: Author OR workspace manager
    const document = await Document.findById(comment.document);
    if (!document) {
      res.status(404);
      return next(new Error('Parent document not found'));
    }

    const isAuthor = comment.author.toString() === userId.toString();

    // Check workspace permission via middleware or direct check
    // If not author, check if they have admin/owner write access to document workspace
    let isManager = false;
    if (!isAuthor) {
      const workspace = await mongoose.model('Workspace').findById(document.workspace);
      if (workspace) {
        if (workspace.owner.toString() === userId.toString()) {
          isManager = true;
        } else {
          const member = workspace.members.find(m => m.user.toString() === userId.toString() && m.status === 'accepted');
          if (member && ['admin', 'owner'].includes(member.role)) {
            isManager = true;
          }
        }
      }
    }

    if (!isAuthor && !isManager) {
      res.status(403);
      return next(new Error('Access Denied: You do not have permissions to delete this comment'));
    }

    comment.isDeleted = true;
    await comment.save();

    res.status(200).json({
      success: true,
      message: 'Comment was successfully soft-deleted',
      data: {
        _id: comment._id,
        isDeleted: true,
        content: 'This comment was deleted.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve a comment thread (Collaborators only)
 * @route   PATCH /api/comments/:commentId/resolve
 * @access  Private
 */
export const resolveComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const { resolved } = req.body;

    if (resolved === undefined) {
      res.status(400);
      return next(new Error('resolved boolean state is required'));
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404);
      return next(new Error('Comment not found'));
    }

    comment.resolved = resolved;
    await comment.save();

    // Log Activity Feed
    const document = await Document.findById(comment.document);
    if (document) {
      await logActivity({
        workspace: document.workspace,
        document: document._id,
        user: req.user._id,
        type: 'COMMENT_RESOLVED',
        details: { commentId, resolved }
      });
    }

    res.status(200).json({
      success: true,
      message: resolved ? 'Comment resolved successfully' : 'Comment reopened successfully',
      data: comment
    });
  } catch (error) {
    next(error);
  }
};
