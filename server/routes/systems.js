import express from 'express';
import { System } from '../models/System.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET ALL SYSTEMS
router.get('/', authenticate, async (req, res) => {
  try {
    const systems = await System.find();
    res.json({ success: true, systems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET SYSTEMS BY LAB
router.get('/lab/:labId', authenticate, async (req, res) => {
  try {
    const systems = await System.find({ lab_id: req.params.labId });
    res.json({ success: true, systems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE SYSTEM STATUS (Manual Override)
router.put('/:id/status', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const sys = await System.findOne({ id: req.params.id });

    if (!sys) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }

    const oldSystem = sys.toObject();
    sys.status = status;
    sys.updatedBy = req.user.id;
    await sys.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      collection: 'systems',
      documentId: sys.id,
      documentBefore: oldSystem,
      documentAfter: sys.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Updated system ${sys.id} status to ${status}`,
    });

    res.json({ success: true, system: sys });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
