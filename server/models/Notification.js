import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = {
  INVITE: 'INVITE',
  MENTION: 'MENTION',
  COMMENT_REPLY: 'COMMENT_REPLY',
  DOCUMENT_SHARED: 'DOCUMENT_SHARED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  OWNER_TRANSFER: 'OWNER_TRANSFER',
  PUBLIC_LINK_ENABLED: 'PUBLIC_LINK_ENABLED',
  PUBLIC_LINK_DISABLED: 'PUBLIC_LINK_DISABLED'
};

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(NOTIFICATION_TYPES)
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
