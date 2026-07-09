import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'invited member',
      'accepted invitation',
      'removed member',
      'changed role',
      'enabled public link',
      'disabled public link',
      'ownership transfer',
      'restored version'
    ]
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
