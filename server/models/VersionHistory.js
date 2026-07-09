import mongoose from 'mongoose';

const VersionHistorySchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true // Holds TipTap JSON document state at this version point
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false // Only createdAt is needed for history records
  }
});

const VersionHistory = mongoose.model('VersionHistory', VersionHistorySchema);
export default VersionHistory;
