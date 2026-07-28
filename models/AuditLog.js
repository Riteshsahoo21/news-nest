import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true, 
  },
  readableAction: {
    type: String, // e.g., "User Login", "Update Article"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  location: {
    type: String, // e.g., "US", "IN" (Mocked for now or extracted from headers)
  },
  endpoint: {
    type: String,
  },
  method: {
    type: String,
  },
  status: {
    type: Number,
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
  responseTime: {
    type: Number, // in ms
  },
  userAgent: {
    type: String, // Browser/Device string
  },
  sessionId: {
    type: String, 
  }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
