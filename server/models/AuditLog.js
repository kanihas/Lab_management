import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'READ', 'MIGRATE'],
      required: true,
    },
    collection: {
      type: String,
      required: true,
      enum: [
        'users',
        'complaints',
        'systems',
        'inventory',
        'stockRequests',
        'notices',
        'labs',
        'departments',
      ],
    },
    documentId: String,
    documentBefore: mongoose.Schema.Types.Mixed,
    documentAfter: mongoose.Schema.Types.Mixed,
    changes: mongoose.Schema.Types.Mixed, // {fieldName: {old: value, new: value}}
    userId: String,
    userName: String,
    userRole: String,
    ipAddress: String,
    description: String,
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    error: String,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'auditLogs' }
);

// Create index for faster queries
auditLogSchema.index({ collection: 1, documentId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
