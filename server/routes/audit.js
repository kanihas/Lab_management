import express from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET ALL AUDIT LOGS (Admin only)
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments();

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET AUDIT LOGS BY COLLECTION
router.get('/collection/:collection', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.find({ collection: req.params.collection })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments({ collection: req.params.collection });

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET AUDIT LOGS FOR SPECIFIC DOCUMENT
router.get('/document/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const logs = await AuditLog.find({ documentId: req.params.id }).sort({ timestamp: -1 });

    res.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET AUDIT LOGS BY USER
router.get('/user/:userId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments({ userId: req.params.userId });

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET AUDIT LOGS IN DATE RANGE
router.get('/range/:startDate/:endDate', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const start = new Date(req.params.startDate);
    const end = new Date(req.params.endDate);

    const logs = await AuditLog.find({
      timestamp: { $gte: start, $lte: end },
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
