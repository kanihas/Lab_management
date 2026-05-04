import express from 'express';
import { Complaint } from '../models/Complaint.js';
import { System } from '../models/System.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET ALL COMPLAINTS
router.get('/', authenticate, async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE COMPLAINT
router.post('/', authenticate, authorize(['staff', 'student']), async (req, res) => {
  try {
    const { id, sys_id, lab_id, desc, priority } = req.body;

    let derived_lab_id = lab_id;
    if (!derived_lab_id && sys_id) {
      const parts = sys_id.split('-');
      if (parts.length >= 2) derived_lab_id = parts[1];
    }

    const complaint = await Complaint.create({
      id: id || 'TKT-' + Math.floor(10000 + Math.random() * 90000),
      sys_id,
      lab_id: derived_lab_id,
      desc,
      priority: priority || 'Medium',
      status: 'Waiting for Lab Incharge Approval',
      history: [
        {
          date: new Date(),
          status: 'Waiting for Lab Incharge Approval',
          notes: 'Complaint logged and queued for lab incharge review.',
        },
      ],
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      collection: 'complaints',
      documentId: complaint.id,
      documentAfter: complaint.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Created complaint ${complaint.id}`,
    });

    res.status(201).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE COMPLAINT STATUS
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const complaint = await Complaint.findOne({ id: req.params.id });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const oldComplaint = complaint.toObject();
    complaint.status = status;
    complaint.history.push({ date: new Date(), status, notes: notes || '' });
    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Audit log
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
      description: `Updated complaint ${complaint.id} status to ${status}`,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ASSIGN TECHNICIAN
router.put('/:id/assign', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { techId } = req.body;
    const complaint = await Complaint.findOne({ id: req.params.id });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const oldComplaint = complaint.toObject();
    complaint.status = 'Assigned to Technician';
    complaint.tech_id = techId;
    complaint.history.push({
      date: new Date(),
      status: 'Assigned to Technician',
      notes: `Approved by Admin and assigned to ${techId}`,
    });
    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Audit log
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
      description: `Assigned complaint ${complaint.id} to technician ${techId}`,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// START WORK
router.put('/:id/start', authenticate, authorize(['technician']), async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ id: req.params.id });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const oldComplaint = complaint.toObject();
    complaint.status = 'In Progress';
    complaint.tech_id = req.user.id;
    complaint.history.push({
      date: new Date(),
      status: 'In Progress',
      notes: 'Technician started physical repairs.',
    });
    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Update system status
    const sys = await System.findOne({ id: complaint.sys_id });
    if (sys) {
      sys.status = 'Under Maintenance';
      await sys.save();
    }

    // Audit log
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
      description: `Started work on complaint ${complaint.id}`,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// COMPLETE WORK
router.put('/:id/complete', authenticate, authorize(['technician']), async (req, res) => {
  try {
    const { notes, parts } = req.body;
    const complaint = await Complaint.findOne({ id: req.params.id });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const oldComplaint = complaint.toObject();
    complaint.status = 'Resolved';
    complaint.techNotes = notes || '';
    complaint.partsUsed = parts || '';
    complaint.history.push({
      date: new Date(),
      status: 'Resolved',
      notes: `Work finished. Notes: ${notes}. Parts: ${parts}`,
    });
    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Audit log
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
      description: `Completed work on complaint ${complaint.id}`,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// VERIFY TASK (Lab Incharge or Admin)
router.put('/:id/verify', authenticate, authorize(['staff', 'admin']), async (req, res) => {
  try {
    const { isApproved, rejectNotes } = req.body;
    const complaint = await Complaint.findOne({ id: req.params.id });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const oldComplaint = complaint.toObject();

    if (isApproved) {
      complaint.status = 'Resolved';
      complaint.history.push({
        date: new Date(),
        status: 'Resolved',
        notes: 'Lab Incharge verified and closed the ticket.',
      });

      // Update system
      const sys = await System.findOne({ id: complaint.sys_id });
      if (sys) {
        sys.status = 'Working';
        sys.failures = (sys.failures || 0) + 1;
        sys.maintenanceHistory.push({
          date: new Date(),
          issue: complaint.desc,
          tech: complaint.tech_id,
          notes: complaint.techNotes,
          parts: complaint.partsUsed,
        });
        await sys.save();
      }
    } else {
      complaint.status = 'Assigned to Technician';
      complaint.history.push({
        date: new Date(),
        status: 'Assigned to Technician',
        notes: `Admin recheck rejected: ${rejectNotes}. Returned to technician.`,
      });
    }

    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Audit log
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
      description: `${isApproved ? 'Approved' : 'Rejected'} complaint ${complaint.id}`,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CLOSE COMPLAINT
router.put('/:id/close', authenticate, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { reason } = req.body;
    const complaint = await Complaint.findOne({ id: req.params.id });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const oldComplaint = complaint.toObject();
    complaint.status = 'Closed';
    complaint.history.push({
      date: new Date(),
      status: 'Closed',
      notes: `Closed: ${reason || ''}`,
    });
    complaint.updatedBy = req.user.id;
    await complaint.save();

    // Audit log
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
      description: `Closed complaint ${complaint.id}`,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
