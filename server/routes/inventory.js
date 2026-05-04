import express from 'express';
import { Inventory } from '../models/Inventory.js';
import { Complaint } from '../models/Complaint.js';
import { System } from '../models/System.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET ALL INVENTORY
router.get('/', authenticate, async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json({ success: true, inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DEDUCT INVENTORY
router.put('/deduct/:itemId', authenticate, authorize(['technician', 'admin']), async (req, res) => {
  try {
    const { complaintId, qty } = req.body;
    const item = await Inventory.findOne({ id: req.params.itemId });
    const complaint = await Complaint.findOne({ id: complaintId });

    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const deductQty = parseInt(qty);
    if (item.stock < deductQty) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    const oldItem = item.toObject();
    const oldComplaint = complaint.toObject();

    // Update inventory
    item.stock -= deductQty;
    item.usedStock += deductQty;
    item.updatedBy = req.user.id;
    await item.save();

    // Update complaint
    complaint.status = 'Resolved';
    const logEntry = `Used ${deductQty}x ${item.item} for repair. System fully restored.`;
    complaint.techNotes = logEntry;
    complaint.partsUsed = (complaint.partsUsed ? complaint.partsUsed + ', ' : '') + `${deductQty}x ${item.item}`;
    complaint.history.push({
      date: new Date(),
      status: 'Resolved',
      notes: logEntry,
    });
    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Update system
    const sys = await System.findOne({ id: complaint.sys_id });
    if (sys) {
      sys.status = 'Working';
      sys.failures = (sys.failures || 0) + 1;
      sys.maintenanceHistory.push({
        date: new Date(),
        issue: complaint.desc,
        tech: complaint.tech_id || 'Technician',
        notes: logEntry,
        parts: `${deductQty}x ${item.item}`,
      });
      await sys.save();
    }

    // Audit logs
    await createAuditLog({
      action: 'UPDATE',
      collection: 'inventory',
      documentId: item.id,
      documentBefore: oldItem,
      documentAfter: item.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Deducted ${deductQty}x ${item.item} from inventory`,
    });

    await createAuditLog({
      action: 'UPDATE',
      collection: 'complaints',
      documentId: complaint.id,
      documentBefore: oldComplaint,
      documentAfter: complaint.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Complaint ${complaint.id} resolved with inventory deduction`,
    });

    res.json({ success: true, message: 'Inventory deducted', item, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
