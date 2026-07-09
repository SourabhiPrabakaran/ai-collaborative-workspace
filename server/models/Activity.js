import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'DOCUMENT_CREATED',
      'DOCUMENT_RENAMED',
      'FOLDER_MOVED',
      'FOLDER_RENAMED',
      'COMMENT_CREATED',
      'COMMENT_RESOLVED',
      'USER_INVITED',
      'ROLE_CHANGED',
      'PUBLIC_LINK_ENABLED',
      'PUBLIC_LINK_DISABLED',
      'VERSION_RESTORED',
      'VERSION_CREATED'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

const Activity = mongoose.model('Activity', ActivitySchema);
export default Activity;
