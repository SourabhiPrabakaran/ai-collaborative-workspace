import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    refPath: 'User'
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true
  },
  selectionRange: {
    from: { type: Number, default: null },
    to: { type: Number, default: null }
  },
  resolved: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const Comment = mongoose.model('Comment', CommentSchema);
export default Comment;
