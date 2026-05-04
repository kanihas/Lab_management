import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { createAuditLog } from '../middleware/audit.js';

const router = express.Router();

// LOGIN ENDPOINT
router.post('/login', async (req, res) => {
  try {
    const { id, password, role, dept } = req.body;

    if (!id || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing credentials' });
    }

    // Find user
    let user = await User.findOne({ id: id.toLowerCase() });

    // Dynamic student enrollment
    const studentPattern = /^(927623bec|927624bec|927625bec|927626bec|927624bev|927625bev|927626bev)(\d{3})$/i;
    if (!user && studentPattern.test(id)) {
      const number = parseInt(id.slice(-3), 10);
      if (number >= 1 && number <= 999 && password === '12345678') {
        user = await User.create({
          id: id.toLowerCase(),
          name: `Student ${id.slice(-3)}`,
          role: 'student',
          d_id: 'ECE',
          password: await hashPassword(password),
        });

        // Audit log
        await createAuditLog({
          action: 'CREATE',
          collection: 'users',
          documentId: user.id,
          documentAfter: { id: user.id, name: user.name, role: 'student' },
          userId: 'SYSTEM',
          userName: 'SYSTEM',
          userRole: 'system',
          ipAddress: req.ipAddress,
          description: 'Auto-enrolled student on first login',
        });
      }
    }

    // Dynamic faculty enrollment for first-time logins using default password
    // Allows non-precreated faculty (admin/staff/technician) to sign in once with default password
    if (!user && ['admin', 'staff', 'technician'].includes(role) && String(password) === '12345678') {
      user = await User.create({
        id: id.toLowerCase(),
        name: `Faculty ${id.slice(-4)}`,
        role: role,
        d_id: dept || 'ECE',
        password: await hashPassword(password),
      });

      await createAuditLog({
        action: 'CREATE',
        collection: 'users',
        documentId: user.id,
        documentAfter: { id: user.id, name: user.name, role: user.role },
        userId: 'SYSTEM',
        userName: 'SYSTEM',
        userRole: 'system',
        ipAddress: req.ipAddress,
        description: 'Auto-enrolled faculty on first login with default password',
      });
    }

    if (!user) {
      // Audit log failed login
      await createAuditLog({
        action: 'READ',
        collection: 'users',
        documentId: id,
        userId: id,
        userName: id,
        userRole: 'unknown',
        ipAddress: req.ipAddress,
        description: 'Failed login attempt - user not found',
        status: 'failed',
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      // Audit log failed login
      await createAuditLog({
        action: 'READ',
        collection: 'users',
        documentId: user.id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        ipAddress: req.ipAddress,
        description: 'Failed login attempt - invalid password',
        status: 'failed',
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify role
    if (role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (role === 'technician' && user.role !== 'technician') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (role === 'staff' && !['staff', 'student'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        d_id: user.d_id,
        lab: user.lab,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit log successful login
    await createAuditLog({
      action: 'READ',
      collection: 'users',
      documentId: user.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      ipAddress: req.ipAddress,
      description: `User ${user.name} (${user.role}) logged in`,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        d_id: user.d_id,
        lab: user.lab,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET CURRENT USER
router.get('/user', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        d_id: user.d_id,
        lab: user.lab,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// LOGOUT (just frontend cleanup, backend doesn't maintain sessions)
router.post('/logout', authenticate, async (req, res) => {
  await createAuditLog({
    action: 'READ',
    collection: 'users',
    documentId: req.user.id,
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    ipAddress: req.ipAddress,
    description: `User ${req.user.name} logged out`,
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

// PASSWORD RESET
router.post('/password-reset', async (req, res) => {
  try {
    const { targetId, newPassword } = req.body;

    if (!targetId || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const user = await User.findOne({ id: targetId.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await hashPassword(newPassword);
    const oldPassword = user.password;

    user.password = hashedPassword;
    user.updatedBy = 'system';
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      collection: 'users',
      documentId: user.id,
      documentBefore: { password: oldPassword },
      documentAfter: { password: hashedPassword },
      userId: 'SYSTEM',
      userName: 'SYSTEM',
      userRole: 'system',
      ipAddress: req.ipAddress,
      description: `Password reset for user ${user.name}`,
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// CHANGE CREDENTIALS (self-service)
router.post('/change-credentials', async (req, res) => {
  try {
    const { currentId, currentPassword, newPassword, newId } = req.body;

    if (!currentId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const user = await User.findOne({ id: currentId.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      await createAuditLog({
        action: 'READ', collection: 'users', documentId: user.id,
        userId: user.id, userName: user.name, userRole: user.role,
        ipAddress: req.ipAddress, description: 'Failed credential-change attempt - invalid current password', status: 'failed'
      });
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const before = { id: user.id, password: user.password };

    // ID changes are not supported via this endpoint; ignore any newId in request
    if (newId) {
      return res.status(400).json({ success: false, message: 'ID changes are not allowed via this endpoint' });
    }

    // Update password
    user.password = await hashPassword(newPassword);
    user.updatedBy = user.id;
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE', collection: 'users', documentId: user.id,
      documentBefore: before, documentAfter: { id: user.id, password: user.password },
      userId: user.id, userName: user.name, userRole: user.role, ipAddress: req.ipAddress,
      description: 'User changed own credentials'
    });

    // Generate a fresh JWT for the updated identity
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role, d_id: user.d_id, lab: user.lab }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, message: 'Credentials updated', token, user: { id: user.id, name: user.name, role: user.role, d_id: user.d_id, lab: user.lab } });
  } catch (error) {
    console.error('Change credentials error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
