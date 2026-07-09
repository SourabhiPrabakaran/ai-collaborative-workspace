import mongoose from 'mongoose';
import { PERMISSIONS, DEFAULT_DOCUMENT_EMOJI } from '../constants/index.js';

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Document',
    trim: true
  },
  emoji: {
    type: String,
    default: DEFAULT_DOCUMENT_EMOJI
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ type: 'doc', content: [] }) // Holds TipTap JSON editor state directly
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastOpened: {
    type: Date,
    default: Date.now
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: Object.values(PERMISSIONS),
      default: PERMISSIONS.WRITE
    }
  }]
}, {
  timestamps: true
});

const Document = mongoose.model('Document', DocumentSchema);
export default Document;
