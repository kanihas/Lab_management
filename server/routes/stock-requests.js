import express from 'express';
import { StockRequest } from '../models/StockRequest.js';
import { Inventory } from '../models/Inventory.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET ALL STOCK REQUESTS
router.get('/', authenticate, async (req, res) => {
  try {
    const requests = await StockRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE STOCK REQUEST
router.post('/', authenticate, authorize(['staff', 'technician']), async (req, res) => {
  try {
    const { item, qty, reason } = req.body;

    const request = await StockRequest.create({
      id: 'REQ-' + Math.floor(10000 + Math.random() * 90000),
      itemId: item.id || 'Custom',
      itemName: item.item || item,
      requestedQty: parseInt(qty),
      reason: reason,
      requesterId: req.user.id,
      requesterName: req.user.name,
      labId: req.user.lab,
      status: 'Pending Lab Incharge Approval',
      progress: 10,
      history: [
        {
          date: new Date(),
          status: 'Pending Lab Incharge Approval',
          notes: 'Request submitted by technician.',
        },
      ],
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      collection: 'stockRequests',
      documentId: request.id,
      documentAfter: request.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Created stock request ${request.id} for ${request.itemName}`,
    });

    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// APPROVE/REJECT STOCK REQUEST (Lab Incharge)
router.put('/:id/approve', authenticate, authorize(['staff']), async (req, res) => {
  try {
    const { approved, notes } = req.body;
    const request = await StockRequest.findOne({ id: req.params.id });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const oldRequest = request.toObject();

    if (approved) {
      request.status = 'Pending Admin Approval';
      request.progress = 50;
      request.history.push({
        date: new Date(),
        status: 'Pending Admin Approval',
        notes: notes || 'Approved by Lab Incharge.',
      });
    } else {
      request.status = 'Rejected';
      request.progress = 100;
      request.history.push({
        date: new Date(),
        status: 'Rejected',
        notes: notes || 'Rejected by Lab Incharge.',
      });
    }

    request.updatedBy = req.user.id;
    await request.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      collection: 'stockRequests',
      documentId: request.id,
      documentBefore: oldRequest,
      documentAfter: request.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `${approved ? 'Approved' : 'Rejected'} stock request ${request.id}`,
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN APPROVE STOCK REQUEST
router.put('/:id/admin-approve', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const request = await StockRequest.findOne({ id: req.params.id });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const oldRequest = request.toObject();
    request.status = 'Approved';
    request.progress = 75;
    request.history.push({
      date: new Date(),
      status: 'Approved',
      notes: 'Request approved by Admin. Awaiting fulfillment.',
    });
    request.updatedBy = req.user.id;
    await request.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      collection: 'stockRequests',
      documentId: request.id,
      documentBefore: oldRequest,
      documentAfter: request.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Admin approved stock request ${request.id}`,
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// FULFILL STOCK REQUEST
router.put('/:id/fulfill', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const request = await StockRequest.findOne({ id: req.params.id });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const oldRequest = request.toObject();

    const item = await Inventory.findOne({
      $or: [{ id: request.itemId }, { item: request.itemName }],
    });

    if (item) {
      const oldItem = item.toObject();
      item.stock += parseInt(request.requestedQty);
      item.initialStock += parseInt(request.requestedQty);
      item.updatedBy = req.user.id;
      await item.save();

      // Audit log for inventory update
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
        description: `Added ${request.requestedQty}x ${request.itemName} to inventory`,
      });
    }

    request.status = 'Completed';
    request.progress = 100;
    request.completionDate = new Date();
    request.history.push({
      date: new Date(),
      status: 'Completed',
      notes: 'Stock fulfilled and updated in inventory by Admin.',
    });
    request.updatedBy = req.user.id;
    await request.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      collection: 'stockRequests',
      documentId: request.id,
      documentBefore: oldRequest,
      documentAfter: request.toObject(),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ipAddress,
      description: `Fulfilled stock request ${request.id}`,
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
