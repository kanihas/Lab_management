import express from 'express';
import { Notice } from '../models/Notice.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET ALL NOTICES
router.get('/', authenticate, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ date: -1 });
    res.json({ success: true, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE NOTICE
router.post('/', authenticate, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { dept, message } = req.body;

    const notice = await Notice.create({
      id: Date.now(),
      dept,
      author: req.user.name,
      message,
      date: new Date(),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      collection: 'notices',
      documentId: notice.id.toString(),
      documentAfter: notice.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Created notice for ${dept}`,
    });

    res.status(201).json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
