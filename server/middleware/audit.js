import { AuditLog } from '../models/AuditLog.js';

// Helper to compute field-level changes
function getChanges(before, after) {
  const changes = {};
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  allKeys.forEach((key) => {
    const oldVal = before?.[key];
    const newVal = after?.[key];

    // Skip internal fields and timestamps
    if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) return;

    // Only log if actually changed
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  });

  return changes;
}

// Create audit entry
export async function createAuditLog({
  action,
  collection,
  documentId,
  documentBefore,
  documentAfter,
  userId,
  userName,
  userRole,
  ipAddress,
  description,
  status = 'success',
  error = null,
}) {
  try {
    const changes = getChanges(documentBefore, documentAfter);

    const auditEntry = await AuditLog.create({
      action,
      collection,
      documentId,
      documentBefore,
      documentAfter,
      changes,
      userId,
      userName,
      userRole,
      ipAddress,
      description,
      status,
      error,
      timestamp: new Date(),
    });

    return auditEntry;
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
}

// Middleware to capture IP
export const captureIpMiddleware = (req, res, next) => {
  req.ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  next();
};

// Helper to log operation before saving
export const logAudit = async (req, res, next) => {
  // Attach helper to request for routes to use
  req.createAuditLog = createAuditLog;
  next();
};
