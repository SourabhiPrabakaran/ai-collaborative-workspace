import mongoose from 'mongoose';
import { ROLES, DEFAULT_WORKSPACE_ICON } from '../constants/index.js';

const WorkspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  icon: {
    type: String,
    default: DEFAULT_WORKSPACE_ICON
  },
  coverImage: {
    type: String,
    default: ''
  },
  favorite: {
    type: Boolean,
    default: false
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EDITOR
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

const Workspace = mongoose.model('Workspace', WorkspaceSchema);
export default Workspace;
