// API Base URL
const API_URL = window.location.origin + '/api';
let authToken = null;

// Theme Management (still uses localStorage for theme preference)
const ThemeManager = {
  init: () => {
    const savedTheme = localStorage.getItem('portal_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
    }
    ThemeManager.updateIcons();
  },
  toggle: () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('portal_theme', isLight ? 'light' : 'dark');
    ThemeManager.updateIcons();
  },
  updateIcons: () => {
    const icons = document.querySelectorAll('.theme-toggle-btn i');
    const isLight = document.body.classList.contains('light-mode');
    icons.forEach((icon) => {
      icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    });
  },
};

// Shared State & Utilities
const APP_VERSION = '2.0';
const STATUS_WAITING_INCHARGE = 'Waiting for Lab Incharge Approval';
const STATUS_WAITING_ADMIN = 'Waiting for Admin Approval';
const STATUS_ASSIGNED_TECH = 'Assigned to Technician';
const STATUS_IN_PROGRESS = 'In Progress';
const STATUS_RESOLVED = 'Resolved';
const STATUS_CLOSED = 'Closed';

// API Helper function
async function apiCall(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      console.error(`API Error: ${response.status}`, result);
      Notifier.show('Error', result.message || 'An error occurred');
      return null;
    }

    return result;
  } catch (error) {
    console.error('API Call Error:', error);
    Notifier.show('Connection Error', 'Failed to connect to server');
    return null;
  }
}

// Auth Controller
const Auth = {
  login: async (id, password, requestedRole, requestedDept) => {
    const result = await apiCall('POST', '/auth/login', {
      id,
      password,
      role: requestedRole,
      dept: requestedDept,
    });

    if (result && result.success && result.token) {
      authToken = result.token;
      localStorage.setItem('portal_auth_token', authToken);
      sessionStorage.setItem('currentUser', JSON.stringify(result.user));
      return result.user;
    }
    return null;
  },

  logout: () => {
    authToken = null;
    localStorage.removeItem('portal_auth_token');
    sessionStorage.removeItem('currentUser');
    window.location.href = '/';
  },

  getCurrentUser: () => {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  },

  requireAuth: async (allowedRoles) => {
    // Try to get token from localStorage if not in memory
    if (!authToken) {
      authToken = localStorage.getItem('portal_auth_token');
    }

    if (!authToken) {
      window.location.href = '/';
      return null;
    }

    const result = await apiCall('GET', '/auth/user');
    if (!result || !result.success) {
      Auth.logout();
      return null;
    }

    const user = result.user;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      alert('Access Denied');
      Auth.logout();
      return null;
    }

    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  },

  resetPassword: async (targetId, newPassword) => {
    const result = await apiCall('POST', '/auth/password-reset', {
      targetId,
      newPassword,
    });
    return result && result.success;
  },
};

// Notifier
const Notifier = {
  show: (title, message, type = 'info') => {
    const container =
      document.getElementById('toast-container') ||
      (() => {
        const c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
        return c;
      })();

    const toast = document.createElement('div');
    toast.className = `toast glass-panel animate-in`;
    toast.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  },
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();

  // Restore token if exists
  const savedToken = localStorage.getItem('portal_auth_token');
  if (savedToken) {
    authToken = savedToken;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = () => Auth.logout();

  const nameDisp = document.getElementById('user-name-display');
  const user = Auth.getCurrentUser();
  if (nameDisp && user) {
    let rName = user.displayRole || user.role;
    nameDisp.textContent = `${user.name} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
  }
});

// STANDARDIZED DATA API (Now using Backend)
const DataAPI = {
  getSystems: async () => {
    const result = await apiCall('GET', '/systems');
    return result?.systems || [];
  },

  getLabs: async () => {
    // Labs data can be cached or fetched
    return [
      { id: 'NL', d_id: 'ECE', name: 'Network Lab', room: 'APJ122', maintainer: 'Ramya R', systems: 30 },
      { id: 'EMP', d_id: 'ECE', name: 'EMP Lab', room: 'APJ235', maintainer: 'Dr. K. Jegatheesan', systems: 12 },
      { id: 'PL', d_id: 'ECE', name: 'Project Lab', room: 'APJ227', maintainer: 'Dr. C. Nandagopal', systems: 13 },
      { id: 'DSP', d_id: 'ECE', name: 'DSP Lab', room: 'APJ217', maintainer: 'Dr. P. Jeyakumar', systems: 64 },
      { id: 'PCB', d_id: 'ECE', name: 'PCB Lab', room: 'APJ238', maintainer: 'Dr. K. Karthikeyan', systems: 37 },
    ];
  },

  getComplaints: async () => {
    const result = await apiCall('GET', '/complaints');
    return result?.complaints || [];
  },

  getTechnicians: async () => {
    // Technicians data - would need a dedicated endpoint or cached
    return [
      { id: '114216', name: 'Ramya R', role: 'technician', d_id: 'ECE', lab: 'NL' },
      { id: '114217', name: 'Keerthana S', role: 'technician', d_id: 'ECE', lab: 'PCB' },
      { id: '114218', name: 'Chandrahasan S', role: 'technician', d_id: 'ECE', lab: 'DSP' },
      { id: '114219', name: 'Durairasu A', role: 'technician', d_id: 'ECE', lab: 'EMP' },
      { id: '114220', name: 'Malar M', role: 'technician', d_id: 'ECE', lab: 'PL' },
    ];
  },

  getNotices: async () => {
    const result = await apiCall('GET', '/notices');
    return result?.notices || [];
  },

  getInventory: async () => {
    const result = await apiCall('GET', '/inventory');
    return result?.inventory || [];
  },

  getStockRequests: async () => {
    const result = await apiCall('GET', '/stock-requests');
    return result?.requests || [];
  },

  saveNotice: async (notice) => {
    const result = await apiCall('POST', '/notices', notice);
    if (result?.success) {
      Notifier.show('Notice Posted', 'Announcement broadcasted successfully.');
    }
  },

  saveComplaint: async (data) => {
    const result = await apiCall('POST', '/complaints', data);
    if (result?.success) {
      Notifier.show('Ticket Created', `Complaint ${result.complaint.id} submitted.`);
    }
  },

  updateComplaintStatus: async (complaintId, status, notes = '') => {
    const result = await apiCall('PUT', `/complaints/${complaintId}`, { status, notes });
    if (result?.success) {
      Notifier.show('Status Updated', `Ticket ${complaintId} is now ${status}.`);
    }
  },

  forwardToIncharge: async (complaintId) => {
    const result = await apiCall('PUT', `/complaints/${complaintId}`, {
      status: STATUS_ASSIGNED_TECH,
      notes: 'Lab Incharge approved and assigned to Technician queue.',
    });
    if (result?.success) {
      Notifier.show('Ticket Forwarded', 'Sent directly to Technicians for resolution.');
    }
  },

  forwardToAdmin: async (complaintId) => {
    const result = await apiCall('PUT', `/complaints/${complaintId}`, {
      status: STATUS_WAITING_ADMIN,
      notes: 'Forwarded to Admin for review.',
    });
    if (result?.success) {
      Notifier.show('Ticket Forwarded', 'Sent to Admin for review.');
    }
  },

  assignComplaint: async (complaintId, techId) => {
    const result = await apiCall('PUT', `/complaints/${complaintId}/assign`, { techId });
    if (result?.success) {
      Notifier.show('Technician Assigned', `Work order sent to ${techId}.`);
    }
  },

  adminApproveComplaint: async (complaintId) => {
    const result = await apiCall('PUT', `/complaints/${complaintId}`, {
      status: STATUS_ASSIGNED_TECH,
      notes: 'Admin verified and forwarded to technician for action.',
    });
    if (result?.success) {
      Notifier.show('Admin Approved', 'Complaint forwarded to technicians.');
    }
  },

  startWork: async (complaintId, techId) => {
    const result = await apiCall('PUT', `/complaints/${complaintId}/start`, {});
    if (result?.success) {
      Notifier.show('Repairs Started', 'Status updated to In Progress.');
    }
  },

  completeWork: async (complaintId, notes = '', parts = '') => {
    const result = await apiCall('PUT', `/complaints/${complaintId}/complete`, { notes, parts });
    if (result?.success) {
      Notifier.show('Task Completed', 'Pending review.');
    }
  },

  replyByTechnician: async (complaintId, replyText, isFixed = false) => {
    const status = isFixed ? STATUS_RESOLVED : STATUS_IN_PROGRESS;
    const result = await apiCall('PUT', `/complaints/${complaintId}`, {
      status,
      notes: replyText,
    });
    if (result?.success) {
      Notifier.show(
        'Technician Reply',
        isFixed ? 'Marked as fixed.' : 'Updated with expected fix timeline.'
      );
    }
  },

  verifyTask: async (complaintId, isApproved, rejectNotes = '') => {
    const result = await apiCall('PUT', `/complaints/${complaintId}/verify`, {
      isApproved,
      rejectNotes,
    });
    if (result?.success) {
      Notifier.show(
        'Action Completed',
        isApproved ? 'Ticket Resolved - System is now back online.' : 'Task Rejected - Sent back to technician for rework.'
      );
    }
  },

  updateSystemStatusOverride: async (sysId, status) => {
    const result = await apiCall('PUT', `/systems/${sysId}/status`, { status });
    if (result?.success) {
      Notifier.show('System Updated', `System ${sysId} status updated`);
    }
  },

  closeComplaint: async (complaintId, reason = '') => {
    const result = await apiCall('PUT', `/complaints/${complaintId}/close`, { reason });
    if (result?.success) {
      Notifier.show('Ticket Closed', 'Complaint has been officially closed.');
    }
  },

  submitStockRequest: async (item, qty, reason) => {
    const result = await apiCall('POST', '/stock-requests', {
      item,
      qty: parseInt(qty),
      reason,
    });
    if (result?.success) {
      Notifier.show('Request Submitted', `Stock request for ${result.request.itemName} sent to Lab Incharge.`);
      return result.request;
    }
    return null;
  },

  approveStockRequest: async (requestId, approved, notes = '') => {
    const result = await apiCall('PUT', `/stock-requests/${requestId}/approve`, {
      approved,
      notes,
    });
    if (result?.success) {
      Notifier.show(
        'Request Status',
        approved ? 'Stock request forwarded to Admin.' : 'Stock request has been rejected.'
      );
    }
  },

  adminApproveStockRequest: async (requestId) => {
    const result = await apiCall('PUT', `/stock-requests/${requestId}/admin-approve`, {});
    if (result?.success) {
      Notifier.show('Action Successful', 'Request marked as Approved.');
    }
  },

  fulfillStockRequest: async (requestId) => {
    const result = await apiCall('PUT', `/stock-requests/${requestId}/fulfill`, {});
    if (result?.success) {
      Notifier.show('Request Fulfilled', `Inventory updated.`);
    }
  },

  deductInventory: async (complaintId, itemId, qty) => {
    const result = await apiCall('PUT', `/inventory/deduct/${itemId}`, {
      complaintId,
      qty: parseInt(qty),
    });
    if (result?.success) {
      Notifier.show('Inventory Deducted', `Used ${qty}x item. Complaint resolved.`);
      return { success: true };
    }
    return { success: false, msg: result?.message || 'Failed to deduct inventory' };
  },
};

// Live timer functions (unchanged)
function getComplaintCurrentStageStart(complaint) {
  if (!complaint) return null;
  const history = Array.isArray(complaint.history) ? complaint.history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] && history[i].status === complaint.status && history[i].date) {
      return history[i].date;
    }
  }
  return complaint.date || null;
}

function formatElapsedDuration(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

window.getComplaintElapsedLabel = function (complaint) {
  const since = getComplaintCurrentStageStart(complaint);
  if (!since) return '00s';
  return formatElapsedDuration(Date.now() - new Date(since).getTime());
};

window.renderComplaintLiveTimer = function (complaint, prefix = 'Live') {
  const since = getComplaintCurrentStageStart(complaint);
  const sinceAttr = since || '';
  const label = window.getComplaintElapsedLabel(complaint);
  return `<span data-live-timer="true" data-since="${sinceAttr}">${prefix}: ${label}</span>`;
};

window.refreshComplaintLiveTimers = function (root = document) {
  root.querySelectorAll('[data-live-timer="true"]').forEach((node) => {
    const since = node.getAttribute('data-since');
    if (!since) return;
    const prefix = (node.textContent || 'Live:').split(':')[0] || 'Live';
    const elapsed = formatElapsedDuration(Date.now() - new Date(since).getTime());
    node.textContent = `${prefix}: ${elapsed}`;
  });
};

window.startComplaintLiveTimerLoop = function (intervalMs = 1000) {
  if (window.__complaintTimerLoop) return;
  window.refreshComplaintLiveTimers();
  window.__complaintTimerLoop = window.setInterval(() => {
    window.refreshComplaintLiveTimers();
  }, intervalMs);
};
