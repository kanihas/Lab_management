// Theme Management
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
        icons.forEach(icon => {
            icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
        });
    }
};

// Shared State & Utilities
const APP_VERSION = '1.4';
const DEFAULT_LOGIN_PASSWORD = '12345678';
const STATUS_WAITING_INCHARGE = 'Waiting for Lab Incharge Approval';
const STATUS_WAITING_ADMIN = 'Waiting for Admin Approval';
const STATUS_ASSIGNED_TECH = 'Assigned to Technician';
const STATUS_IN_PROGRESS = 'In Progress';
const STATUS_RESOLVED = 'Resolved';
const STATUS_CLOSED = 'Closed';

const FIXED_LOGIN_IDS = new Set([
    '114210',
    '114211',
    '114212',
    '114213',
    '114214',
    '114215',
    '114216',
    '114217',
    '114218',
    '114219',
    '114220'
]);

const CANONICAL_STAFF_USERS = [
    { id: '114211', name: 'Ramya R', role: 'staff', d_id: 'ECE', lab: 'NL' },
    { id: '114212', name: 'Dr. K.Jegatheesan', role: 'staff', d_id: 'ECE', lab: 'EMP' },
    { id: '114213', name: 'Dr. C.Nandagopal', role: 'staff', d_id: 'ECE', lab: 'PL' },
    { id: '114214', name: 'Dr. P.Jeyakumar', role: 'staff', d_id: 'ECE', lab: 'DSP' },
    { id: '114215', name: 'Dr. K.Karthikeyan', role: 'staff', d_id: 'ECE', lab: 'PCB' }
];

const CANONICAL_TECH_USERS = [
    { id: '114216', name: 'Ramya R', role: 'technician', d_id: 'ECE', lab: 'NL' },
    { id: '114217', name: 'Keerthana S', role: 'technician', d_id: 'ECE', lab: 'PCB' },
    { id: '114218', name: 'Chandrahasan S', role: 'technician', d_id: 'ECE', lab: 'DSP' },
    { id: '114219', name: 'Durairasu A', role: 'technician', d_id: 'ECE', lab: 'EMP' },
    { id: '114220', name: 'Malar M', role: 'technician', d_id: 'ECE', lab: 'PL' }
];

const CANONICAL_LABS = [
    { id: 'NL', d_id: 'ECE', name: 'Network Lab', room: 'APJ122', maintainer: 'Ramya R', systems: 30 },
    { id: 'EMP', d_id: 'ECE', name: 'EMP Lab', room: 'APJ235', maintainer: 'Dr. K. Jegatheesan', systems: 12 },
    { id: 'PL', d_id: 'ECE', name: 'Project Lab', room: 'APJ227', maintainer: 'Dr. C. Nandagopal', systems: 13 },
    { id: 'DSP', d_id: 'ECE', name: 'DSP Lab', room: 'APJ217', maintainer: 'Dr. P. Jeyakumar', systems: 64 },
    { id: 'PCB', d_id: 'ECE', name: 'PCB Lab', room: 'APJ238', maintainer: 'Dr. K. Karthikeyan', systems: 37 }
];

function buildSystemsForLabs(labs) {
    const systems = [];
    (labs || []).forEach(lab => {
        for (let j = 1; j <= Number(lab.systems || 0); j++) {
            const sysId = `PC-${lab.id}-${j.toString().padStart(2, '0')}`;
            systems.push({ id: sysId, lab_id: lab.id, status: 'Working', failures: 0, maintenanceHistory: [] });
        }
    });
    return systems;
}

function isStudentLoginId(id) {
    const regex = /^(927623bec|927624bec|927625bec|927626bec|927624bev|927625bev|927626bev)(\d{3})$/i;
    const match = regex.exec(String(id || ''));
    if (!match) return false;
    const number = parseInt(match[2], 10);
    return number >= 1 && number <= 999;
}

function isAllowedLoginId(id) {
    return FIXED_LOGIN_IDS.has(String(id || '')) || isStudentLoginId(id);
}

// Mass pre-population is disabled in favor of dynamic enrollment during login
function buildStudentUsers() {
    return [];
}

function isRoleMatchForLogin(user, requestedRole) {
    if (!user || !requestedRole) return false;
    if (requestedRole === 'admin') return user.role === 'admin';
    if (requestedRole === 'technician') return user.role === 'technician';
    if (requestedRole === 'staff') return user.role === 'staff' || user.role === 'student';
    return user.role === requestedRole;
}

function findLatestUserById(users, id) {
    const normalizedId = String(id || '').toLowerCase();
    for (let index = (users || []).length - 1; index >= 0; index--) {
        const user = users[index];
        if (String(user?.id || '').toLowerCase() === normalizedId) {
            return user;
        }
    }
    return null;
}

const defaultData = (() => {
    const data = {
        users: [
            { id: '114210', name: 'Admin', role: 'admin', d_id: 'ECE', password: DEFAULT_LOGIN_PASSWORD },
            ...CANONICAL_STAFF_USERS.map(user => ({ ...user, password: DEFAULT_LOGIN_PASSWORD })),
            ...CANONICAL_TECH_USERS.map(user => ({ ...user, password: DEFAULT_LOGIN_PASSWORD }))
        ],
        departments: [
            { id: 'ECE', name: 'Electronics & Communication Eng.' }
        ],
        labs: CANONICAL_LABS.map(lab => ({ ...lab })),
        systems: buildSystemsForLabs(CANONICAL_LABS),
        notices: [
            { id: 1, dept: 'ECE', author: 'HOD', message: 'Welcome to the MKCE System Status Portal. All operations are live.', date: new Date().toISOString() }
        ],
        inventory: [
            { id: 'I1', item: 'LED Monitor (24")', initialStock: 100, usedStock: 40, stock: 60, status: 'Good' },
            { id: 'I2', item: 'RAM (8GB DDR4)', initialStock: 200, usedStock: 80, stock: 120, status: 'Good' },
            { id: 'I3', item: 'Mechanical Keyboard', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' },
            { id: 'I4', item: 'Optical Mouse', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' },
            { id: 'I5', item: 'SMPS (450W)', initialStock: 60, usedStock: 20, stock: 40, status: 'In Stock' },
            { id: 'I6', item: 'SATA/HDMI Cables', initialStock: 300, usedStock: 100, stock: 200, status: 'Good' },
            { id: 'I7', item: 'CMOS Batteries', initialStock: 100, usedStock: 50, stock: 50, status: 'Good' },
            { id: 'I8', item: 'CPU (Processor)', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' }
        ],
        complaints: [
            // 8 Active Issues to match Screenshot 1
            { id: 'ECE-TKT-7135', sys_id: 'PC-NL-05', lab_id: 'NL', desc: 'Monitor flickering issue', priority: 'Medium', status: 'In Progress', date: new Date().toISOString(), tech_id: '114216' },
            { id: 'ECE-TKT-8857', sys_id: 'PC-DSP-05', lab_id: 'DSP', desc: 'System not booting', priority: 'Medium', status: 'Assigned to Technician', date: new Date().toISOString(), tech_id: '114218' },
            { id: 'ECE-TKT-4887', sys_id: 'PC-PL-05', lab_id: 'PL', desc: 'Keyboard key stuck', priority: 'Medium', status: 'Assigned to Technician', date: new Date().toISOString(), tech_id: '114220' },
            { id: 'ECE-TKT-6109', sys_id: 'PC-EMP-05', lab_id: 'EMP', desc: 'Mouse sensor issue', priority: 'Medium', status: 'Assigned to Technician', date: new Date().toISOString(), tech_id: '114219' },
            { id: 'ECE-TKT-1025', sys_id: 'PC-PCB-01', lab_id: 'PCB', desc: 'Software update required', priority: 'Low', status: 'Waiting for Lab Incharge Approval', date: new Date().toISOString() },
            { id: 'ECE-TKT-2234', sys_id: 'PC-NL-02', lab_id: 'NL', desc: 'Network cable broken', priority: 'High', status: 'In Progress', date: new Date().toISOString(), tech_id: '114216' },
            { id: 'ECE-TKT-3345', sys_id: 'PC-DSP-02', lab_id: 'DSP', desc: 'Power supply failure', priority: 'High', status: 'Assigned to Technician', date: new Date().toISOString(), tech_id: '114218' },
            { id: 'ECE-TKT-5567', sys_id: 'PC-PL-02', lab_id: 'PL', desc: 'RAM upgrade request', priority: 'Medium', status: 'Waiting for Admin Approval', date: new Date().toISOString() },
            
            // 6 Resolved Issues to match Screenshot 1
            { id: 'ECE-TKT-9901', sys_id: 'PC-PCB-02', lab_id: 'PCB', desc: 'Fixed cooling fan', priority: 'Medium', status: 'Resolved', date: new Date().toISOString(), tech_id: '114217' },
            { id: 'ECE-TKT-9902', sys_id: 'PC-NL-03', lab_id: 'NL', desc: 'Replaced CMOS battery', priority: 'Low', status: 'Resolved', date: new Date().toISOString(), tech_id: '114216' },
            { id: 'ECE-TKT-9903', sys_id: 'PC-DSP-03', lab_id: 'DSP', desc: 'Updated OS', priority: 'Medium', status: 'Resolved', date: new Date().toISOString(), tech_id: '114218' },
            { id: 'ECE-TKT-9904', sys_id: 'PC-PL-03', lab_id: 'PL', desc: 'Resolved driver conflict', priority: 'Medium', status: 'Resolved', date: new Date().toISOString(), tech_id: '114220' },
            { id: 'ECE-TKT-9905', sys_id: 'PC-EMP-02', lab_id: 'EMP', desc: 'Replaced faulty RAM', priority: 'High', status: 'Resolved', date: new Date().toISOString(), tech_id: '114219' },
            { id: 'ECE-TKT-9906', sys_id: 'PC-PCB-03', lab_id: 'PCB', desc: 'Cleaned internal components', priority: 'Low', status: 'Resolved', date: new Date().toISOString(), tech_id: '114217' }
        ],
        stockRequests: [
            { id: 'STK-001', labId: 'NL', requesterName: 'Ramya R', itemName: 'Optical Mouse', requestedQty: 10, reason: 'Replacing faulty units', status: 'Pending Admin Approval', date: new Date().toISOString() },
            { id: 'STK-002', labId: 'DSP', requesterName: 'Dr. P. Jeyakumar', itemName: 'RAM (8GB DDR4)', requestedQty: 5, reason: 'Lab upgrade', status: 'Pending Admin Approval', date: new Date().toISOString() },
            { id: 'STK-003', labId: 'EMP', requesterName: 'Dr. K. Jegatheesan', itemName: 'SMPS (450W)', requestedQty: 2, reason: 'Power supply failure', status: 'Pending Admin Approval', date: new Date().toISOString() }
        ]
    };

    return data;
})();

// Initialize DB
function initDB() {
    const currentVersion = APP_VERSION; 
    const storedVersion = localStorage.getItem('portal_version');

    if (!localStorage.getItem('portal_db') || storedVersion !== currentVersion) {
        console.log("Initializing database...");
        localStorage.setItem('portal_db', JSON.stringify(defaultData));
        localStorage.setItem('portal_version', currentVersion);
    } else {
        // Migrate credentials in existing browser storage to match the current policy.
        const db = JSON.parse(localStorage.getItem('portal_db'));
        if (!db || !Array.isArray(db.users)) return;

        const takeUsersByRole = role => db.users.filter(u => u.role === role);

        const admin = takeUsersByRole('admin')[0];
        if (admin) {
            admin.id = '114210';
            admin.password = DEFAULT_LOGIN_PASSWORD;
        }

        const staffUsers = takeUsersByRole('staff');
        const staffById = new Map(staffUsers.map(user => [String(user.id), user]));
        const canonicalStaffUsers = CANONICAL_STAFF_USERS.map(profile => {
            const existingUser = staffById.get(profile.id) || {};
            return {
                ...existingUser,
                ...profile,
                password: existingUser.password || DEFAULT_LOGIN_PASSWORD
            };
        });

        const techUsers = takeUsersByRole('technician');
        const techById = new Map(techUsers.map(u => [String(u.id), u]));
        const canonicalTechUsers = CANONICAL_TECH_USERS.map(profile => {
            const existingUser = techById.get(profile.id) || {};
            return {
                ...existingUser,
                ...profile,
                password: existingUser.password || DEFAULT_LOGIN_PASSWORD
            };
        });

        const existingUserIds = new Set(db.users.map(u => u.id));
        buildStudentUsers().forEach(student => {
            if (!existingUserIds.has(student.id)) {
                db.users.push(student);
            }
        });

        db.users = db.users.filter(u => 
            !CANONICAL_STAFF_USERS.some(p => p.id === u.id) && 
            !CANONICAL_TECH_USERS.some(p => p.id === u.id)
        );
        db.users.push(...canonicalStaffUsers);
        db.users.push(...canonicalTechUsers);

        db.users.forEach(u => {
            if (!u.password) u.password = DEFAULT_LOGIN_PASSWORD;
        });

        // Preserve any faculty IDs that were changed by the user.
        // Student IDs are still validated at login time via the dynamic student pattern.

        db.labs = CANONICAL_LABS.map(lab => ({ ...lab }));
        const canonicalSystemIds = new Set(buildSystemsForLabs(db.labs).map(s => s.id));
        const existingSystems = Array.isArray(db.systems) ? db.systems : [];
        const hasValidSystems = existingSystems.some(s => canonicalSystemIds.has(String(s.id || '')));
        if (hasValidSystems) {
            db.systems = existingSystems
                .filter(s => canonicalSystemIds.has(String(s.id || '')))
                .map(s => ({
                    ...s,
                    lab_id: String(s.lab_id || '').toUpperCase(),
                    status: s.status || 'Working',
                    failures: Number(s.failures || 0),
                    maintenanceHistory: Array.isArray(s.maintenanceHistory) ? s.maintenanceHistory : []
                }));
        } else {
            db.systems = buildSystemsForLabs(db.labs);
        }

        db.complaints = (db.complaints || []).map(c => {
            if (c.status === 'Pending (Admin Approval)' || c.status === 'Pending Admin' || c.status === 'Pending') {
                c.status = STATUS_WAITING_INCHARGE;
            } else if (c.status === 'Waiting for Incharge Review') {
                c.status = STATUS_WAITING_INCHARGE;
            } else if (c.status === 'Waiting for Admin Approval') {
                c.status = STATUS_WAITING_ADMIN;
            }

            if (!c.lab_id && c.sys_id) {
                const match = /^PC-([A-Z]+)-\d+$/i.exec(String(c.sys_id)) || /^([A-Z]+)-\d+$/i.exec(String(c.sys_id));
                if (match) c.lab_id = String(match[1]).toUpperCase();
            }

            return c;
        });

        // Ensure inventory counts for Mouse, Keyboard, and CPU are correct
        if (!Array.isArray(db.inventory)) db.inventory = defaultData.inventory;
        
        db.inventory.forEach(item => {
            if (item.initialStock === undefined) {
                // Migration: assume current stock is remaining from a total of stock * 1.5
                item.initialStock = Math.ceil(item.stock * 1.5);
                item.usedStock = item.initialStock - item.stock;
            }
        });

        const mouse = db.inventory.find(i => i.item.toLowerCase().includes('mouse'));
        if (mouse) { mouse.stock = 156; mouse.initialStock = 200; mouse.usedStock = 44; }
        
        const keyboard = db.inventory.find(i => i.item.toLowerCase().includes('keyboard'));
        if (keyboard) { keyboard.stock = 156; keyboard.initialStock = 200; keyboard.usedStock = 44; }
        
        const cpu = db.inventory.find(i => i.item.toLowerCase().includes('cpu'));
        if (cpu) {
            cpu.stock = 156; cpu.initialStock = 200; cpu.usedStock = 44;
        } else {
            db.inventory.push({ id: 'I8', item: 'CPU (Processor)', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' });
        }

        localStorage.setItem('portal_db', JSON.stringify(db));
    }
    
    // Ensure stockRequests array exists
    const rawDB = localStorage.getItem('portal_db');
    if (rawDB) {
        const db = JSON.parse(rawDB);
        if (db && !db.stockRequests) {
            db.stockRequests = [];
            localStorage.setItem('portal_db', JSON.stringify(db));
        }
    }
}

// Get Data
function getDB() {
    return JSON.parse(localStorage.getItem('portal_db'));
}

// Save Data
function saveDB(data) {
    localStorage.setItem('portal_db', JSON.stringify(data));
    window.dispatchEvent(new Event('portal_db_updated'));
}

// Global Factory Reset
window.hardResetSystem = function() {
    if(confirm("Factory Reset: This will clear ALL data and complaints. Continue?")) {
        localStorage.removeItem('portal_db');
        localStorage.removeItem('portal_version');
        sessionStorage.clear();
        location.reload();
    }
};

window.addEventListener('storage', (e) => {
    if (e.key === 'portal_db') {
        window.dispatchEvent(new Event('portal_db_updated'));
    }
});

// Auth Controller
const Auth = {
    login: (id, password, requestedRole, requestedDept) => {
        const db = getDB();

        // Keep credential policy consistent
        db.users.forEach(u => {
            if (!u.password) u.password = DEFAULT_LOGIN_PASSWORD;
        });

        let user = findLatestUserById(db.users, id);

        // Dynamic Student Enrollment
        if (!user && isStudentLoginId(id)) {
            if (String(password) === DEFAULT_LOGIN_PASSWORD) {
                user = {
                    id: String(id).toLowerCase(),
                    name: `Student ${id.slice(-3)}`,
                    role: 'student',
                    d_id: 'ECE',
                    password: DEFAULT_LOGIN_PASSWORD
                };
                db.users.push(user);
                saveDB(db);
            }
        }

        if (user) {
            if (!isRoleMatchForLogin(user, requestedRole)) {
                return null;
            }
            if (String(user.password || DEFAULT_LOGIN_PASSWORD) !== String(password)) {
                return null;
            }
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        return null;
    },
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },
    getCurrentUser: () => {
        const user = sessionStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },
    resetPassword: (targetId, newPassword) => {
        const db = getDB();
        const normalizedId = String(targetId || '').trim().toLowerCase();
        const updatedPassword = String(newPassword || '');

        if (!normalizedId || !updatedPassword) {
            return false;
        }

        let matched = false;
        const updatedUsers = (db.users || []).map(user => {
            if (String(user.id || '').toLowerCase() !== normalizedId) {
                return user;
            }

            matched = true;
            return {
                ...user,
                password: updatedPassword
            };
        });

        if (!matched) {
            return false;
        }

        db.users = updatedUsers;

        saveDB(db);

        const currentUser = Auth.getCurrentUser();
        if (currentUser && String(currentUser.id || '').toLowerCase() === normalizedId) {
            const refreshedUser = findLatestUserById(db.users, normalizedId);
            if (refreshedUser) {
                sessionStorage.setItem('currentUser', JSON.stringify(refreshedUser));
            }
        }

        return true;
    },
    requireAuth: (allowedRoles) => {
        const sessionUser = Auth.getCurrentUser();
        if (!sessionUser) {
            window.location.href = 'index.html';
            return null;
        }
        const db = getDB();
        const persistedUser = findLatestUserById(db.users, sessionUser.id);
        if (!persistedUser) {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return null;
        }
        if (String(persistedUser.password || DEFAULT_LOGIN_PASSWORD) !== String(sessionUser.password || DEFAULT_LOGIN_PASSWORD)) {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return null;
        }
        if (allowedRoles && !allowedRoles.includes(persistedUser.role)) {
            alert('Access Denied');
            Auth.logout();
            return null;
        }
        // Keep session in sync with canonical DB user fields (lab, department, role, etc.).
        sessionStorage.setItem('currentUser', JSON.stringify(persistedUser));
        return persistedUser;
    }
};

// Notifier
const Notifier = {
    show: (title, message, type = 'info') => {
        const container = document.getElementById('toast-container') || (() => {
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
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    initDB();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = () => Auth.logout();

    const nameDisp = document.getElementById('user-name-display');
    const user = Auth.getCurrentUser();
    if (nameDisp && user) {
        let rName = user.displayRole || user.role;
        if (user.role === 'student') {
            nameDisp.textContent = `${user.id} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
        } else {
            nameDisp.textContent = `${user.name} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
        }
    }

    // Wire change credentials button (exists on multiple pages)
    const changeBtns = document.querySelectorAll('#changeCredBtn');
    changeBtns.forEach(b => b.addEventListener('click', (e) => {
        openChangeCredentialsModal();
    }));
});

// Change Credentials Modal utilities
function openChangeCredentialsModal() {
    // create modal if not present
    if (document.getElementById('changeCredModal')) {
        document.getElementById('changeCredModal').style.display = 'block';
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'changeCredModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="margin-top:0;">Change Credentials</h3>
            <p style="color:#94a3b8; font-size:0.9rem;">Change your account password. ID changes are not allowed.</p>
            <form id="changeCredForm">
                <div class="form-group" style="text-align:left; margin-bottom:0.75rem;">
                    <label style="font-size:0.85rem; color:#94a3b8; display:block; margin-bottom:0.25rem;">Current Password</label>
                    <input type="password" id="currentPass" class="form-control" placeholder="Current Password" required>
                </div>
                <div class="form-group" style="text-align:left; margin-bottom:0.75rem;">
                    <label style="font-size:0.85rem; color:#94a3b8; display:block; margin-bottom:0.25rem;">New Password</label>
                    <input type="password" id="newPass" class="form-control" placeholder="New Password (min 4)" required minlength="4">
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button type="button" class="btn btn-outline" onclick="document.getElementById('changeCredModal').style.display='none'">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
                <div id="changeCredMsg" style="margin-top:0.75rem; display:none; font-size:0.9rem;"></div>
            </form>
        </div>`;
    document.body.appendChild(modal);

    // No ID changes allowed; modal only handles password update
    const user = Auth.getCurrentUser();

    document.getElementById('changeCredForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleChangeCredentialsSubmit();
    });

    modal.style.display = 'block';
}

async function handleChangeCredentialsSubmit() {
    const user = Auth.getCurrentUser();
    if (!user) return window.location.href = 'index.html';

    const currentPass = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const msgEl = document.getElementById('changeCredMsg');

    // Basic validations
    if (!currentPass || !newPass) {
        msgEl.style.display = 'block'; msgEl.style.color = '#ef4444'; msgEl.textContent = 'Please fill required fields.'; return;
    }

    // Try server-side change first (preferred). If server is unreachable, fall back to local-only update.
    try {
        const payload = {
            currentId: user.id,
            currentPassword: currentPass,
            newPassword: newPass
        };

        const resp = await fetch('/api/auth/change-credentials', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            // If server doesn't know this user yet (not found), fall back to local update
            if (resp.status === 404) {
                console.warn('Server reports user not found, falling back to local update');
            } else {
                msgEl.style.display = 'block'; msgEl.style.color = '#ef4444'; msgEl.textContent = err.message || 'Server rejected the change.'; return;
            }
        } else {
            const body = await resp.json();
            // Update local DB to stay in sync with server
            const db = getDB();
                const persisted = db.users.find(u => u.id === user.id) || db.users.find(u => u.name === user.name);
                if (persisted) {
                    persisted.password = newPass;
                } else {
                    // create local record if missing
                    db.users.push({ id: body.user.id, name: body.user.name, role: body.user.role, d_id: body.user.d_id, lab: body.user.lab, password: newPass });
                }
            saveDB(db);

            // Update session and UI
            sessionStorage.setItem('currentUser', JSON.stringify({ ...body.user }));
            msgEl.style.display = 'block'; msgEl.style.color = '#10b981'; msgEl.textContent = 'Credentials updated successfully.';
            setTimeout(() => {
                const modal = document.getElementById('changeCredModal');
                if (modal) modal.style.display = 'none';
                const nameDisp = document.getElementById('user-name-display');
                if (nameDisp) {
                    let rName = (body.user.displayRole || body.user.role) || user.role;
                    if (body.user.role === 'student') {
                        nameDisp.textContent = `${body.user.id} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
                    } else {
                        nameDisp.textContent = `${body.user.name} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
                    }
                }
            }, 900);
            return;
        }

        const body = await resp.json();
        // Update local DB to stay in sync with server (password only)
        const db = getDB();
        const persisted = db.users.find(u => u.id === user.id) || db.users.find(u => u.name === user.name);
        if (persisted) {
            persisted.password = newPass;
        } else {
            // create local record if missing
            db.users.push({ id: body.user.id, name: body.user.name, role: body.user.role, d_id: body.user.d_id, lab: body.user.lab, password: newPass });
        }
        saveDB(db);

        // Update session and UI
        sessionStorage.setItem('currentUser', JSON.stringify({ ...body.user }));
        msgEl.style.display = 'block'; msgEl.style.color = '#10b981'; msgEl.textContent = 'Credentials updated successfully.';
        setTimeout(() => {
            const modal = document.getElementById('changeCredModal');
            if (modal) modal.style.display = 'none';
            const nameDisp = document.getElementById('user-name-display');
            if (nameDisp) {
                let rName = (body.user.displayRole || body.user.role) || user.role;
                if (body.user.role === 'student') {
                    nameDisp.textContent = `${body.user.id} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
                } else {
                    nameDisp.textContent = `${body.user.name} (${rName.charAt(0).toUpperCase() + rName.slice(1)})`;
                }
            }
        }, 900);
        return;
    } catch (e) {
        // Fall through to local update if server call fails
        console.warn('Server change-credentials failed, falling back to local update', e);
    }

    // FALLBACK: local-only update (for demo/offline mode)
    const db = getDB();
    const persisted = db.users.find(u => u.id === user.id);
    if (!persisted) { msgEl.style.display = 'block'; msgEl.style.color = '#ef4444'; msgEl.textContent = 'User not found.'; return; }

    // verify current password locally
    const currPassVal = persisted.password || DEFAULT_LOGIN_PASSWORD;
    if (String(currPassVal) !== String(currentPass)) {
        msgEl.style.display = 'block'; msgEl.style.color = '#ef4444'; msgEl.textContent = 'Current password is incorrect.'; return;
    }

    // ID changes are not allowed in local fallback either
    const anyIdInput = document.getElementById('newFacultyId');
    if (anyIdInput && anyIdInput.value) {
        msgEl.style.display = 'block'; msgEl.style.color = '#ef4444'; msgEl.textContent = 'ID changes are not allowed.'; return;
    }

    persisted.password = newPass;
    saveDB(db);
    sessionStorage.setItem('currentUser', JSON.stringify(persisted));
    msgEl.style.display = 'block'; msgEl.style.color = '#10b981'; msgEl.textContent = 'Credentials updated locally.';
    setTimeout(() => { const modal = document.getElementById('changeCredModal'); if (modal) modal.style.display = 'none'; }, 900);
}

// STANDARDIZED DATA API
const DataAPI = {
    getSystems: () => getDB().systems,
    getLabs: () => getDB().labs,
    getComplaints: () => getDB().complaints,
    getTechnicians: () => getDB().users.filter(u => u.role === 'technician'),
    getNotices: () => getDB().notices || [],
    getInventory: () => getDB().inventory || [],
    getStockRequests: () => getDB().stockRequests || [],

    saveNotice: (notice) => {
        const db = getDB();
        db.notices.push({ ...notice, id: Date.now(), date: new Date().toISOString() });
        saveDB(db);
        Notifier.show('Notice Posted', 'Announcement broadcasted successfully.');
    },

    saveComplaint: (data) => {
        const db = getDB();
        
        let derived_lab_id = data.lab_id;
        
        // If lab_id missing or named full name, attempt extraction from sys_id (format: PC-LABID-NN)
        if (!derived_lab_id && data.sys_id) {
            const parts = data.sys_id.split('-');
            if (parts.length >= 2) derived_lab_id = parts[1];
        }

        const newComplaint = {
            id: data.id || ('TKT-' + Math.floor(10000 + Math.random() * 90000)),
            ...data,
            lab_id: derived_lab_id,
            status: data.status || STATUS_WAITING_INCHARGE,
            date: new Date().toISOString(),
            history: data.history || [{ date: new Date().toISOString(), status: STATUS_WAITING_INCHARGE, notes: 'Complaint logged and queued for lab incharge review.' }]
        };
        db.complaints.push(newComplaint);
        saveDB(db);
        Notifier.show('Ticket Created', `Complaint ${newComplaint.id} submitted.`);
    },

    updateComplaintStatus: (complaintId, status, notes = '') => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = status;
            c.history.push({ date: new Date().toISOString(), status: status, notes: notes });
            saveDB(db);
            Notifier.show('Status Updated', `Ticket ${complaintId} is now ${status}.`);
        }
    },

    forwardToIncharge: (complaintId) => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = STATUS_ASSIGNED_TECH;
            c.tech_id = 'Technician Queue';
            c.history.push({ date: new Date().toISOString(), status: STATUS_ASSIGNED_TECH, notes: 'Lab Incharge approved and assigned to Technician queue.' });
            saveDB(db);
            Notifier.show('Ticket Forwarded', 'Sent directly to Technicians for resolution.');
        }
    },

    forwardToAdmin: (complaintId) => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = STATUS_ASSIGNED_TECH;
            c.tech_id = 'Technician Queue';
            c.history.push({ date: new Date().toISOString(), status: STATUS_ASSIGNED_TECH, notes: 'Lab Incharge approved and assigned to Technician queue.' });
            saveDB(db);
            Notifier.show('Ticket Forwarded', 'Sent directly to Technicians for resolution.');
        }
    },

    assignComplaint: (complaintId, techId) => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = STATUS_ASSIGNED_TECH;
            c.tech_id = techId;
            c.history.push({ date: new Date().toISOString(), status: STATUS_ASSIGNED_TECH, notes: `Approved by Admin and assigned to ${techId} for technician response.` });
            saveDB(db);
            Notifier.show('Technician Assigned', `Work order sent to ${techId}.`);
        }
    },

    adminApproveComplaint: (complaintId) => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = STATUS_ASSIGNED_TECH;
            c.tech_id = 'Technician Queue';
            c.history.push({ date: new Date().toISOString(), status: STATUS_ASSIGNED_TECH, notes: 'Admin verified and forwarded to technician for action.' });
            saveDB(db);
            Notifier.show('Admin Approved', 'Complaint forwarded to technicians.');
        }
    },

    startWork: (complaintId, techId) => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = 'In Progress';
            if (techId) c.tech_id = techId;
            if (!c.history) c.history = [];
            c.history.push({ date: new Date().toISOString(), status: 'In Progress', notes: 'Technician started physical repairs.' });
            const sys = db.systems.find(s => s.id === c.sys_id);
            if (sys) sys.status = 'Under Maintenance';
            saveDB(db);
            Notifier.show('Repairs Started', 'Status updated to In Progress.');
        }
    },

    completeWork: (complaintId, notes = '', parts = '') => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = STATUS_RESOLVED;
            c.techNotes = notes;
            c.partsUsed = parts;
            c.history.push({ date: new Date().toISOString(), status: STATUS_RESOLVED, notes: `Work finished. Notes: ${notes}. Parts: ${parts}` });
            saveDB(db);
            Notifier.show('Task Completed', 'Pending review.');
        }
    },

    replyByTechnician: (complaintId, replyText, isFixed = false) => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            const timestamp = new Date().toISOString();
            c.techReply = replyText;
            if (isFixed) {
                c.status = STATUS_RESOLVED;
                c.techNotes = replyText;
                c.history.push({ date: timestamp, status: STATUS_RESOLVED, notes: replyText });
                const sys = db.systems.find(s => s.id === c.sys_id);
                if (sys) {
                    sys.status = 'Working';
                    sys.failures++;
                    sys.maintenanceHistory.push({
                        date: timestamp,
                        issue: c.desc,
                        tech: c.tech_id || 'Technician',
                        notes: replyText,
                        parts: c.partsUsed || ''
                    });
                }
                Notifier.show('Technician Reply', 'Marked as fixed.');
            } else {
                c.status = STATUS_IN_PROGRESS;
                c.history.push({ date: timestamp, status: STATUS_IN_PROGRESS, notes: replyText });
                const sys = db.systems.find(s => s.id === c.sys_id);
                if (sys && sys.status === 'Working') {
                    sys.status = 'Under Maintenance';
                }
                Notifier.show('Technician Reply', 'Updated with expected fix timeline.');
            }
            saveDB(db);
        }
    },

    verifyTask: (complaintId, isApproved, rejectNotes = '') => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            if (isApproved) {
                c.status = STATUS_RESOLVED;
                c.history.push({ date: new Date().toISOString(), status: STATUS_RESOLVED, notes: 'Lab Incharge verified and closed the ticket.' });
                const sys = db.systems.find(s => s.id === c.sys_id);
                if (sys) {
                    sys.status = 'Working';
                    sys.failures++;
                    sys.maintenanceHistory.push({
                        date: new Date().toISOString(),
                        issue: c.desc,
                        tech: c.tech_id,
                        notes: c.techNotes,
                        parts: c.partsUsed
                    });
                }
                Notifier.show('Ticket Resolved', 'System is now back online.');
            } else {
                c.status = STATUS_ASSIGNED_TECH;
                c.history.push({ date: new Date().toISOString(), status: STATUS_ASSIGNED_TECH, notes: `Admin recheck rejected: ${rejectNotes}. Returned to technician.` });
                Notifier.show('Task Rejected', 'Sent back to technician for rework.');
            }
            saveDB(db);
        }
    },

    updateSystemStatusOverride: (sysId, status) => {
        const db = getDB();
        const sys = db.systems.find(s => s.id === sysId);
        if (sys) {
            sys.status = status;
            saveDB(db);
        }
    },

    closeComplaint: (complaintId, reason = '') => {
        const db = getDB();
        const c = db.complaints.find(x => x.id === complaintId);
        if (c) {
            c.status = 'Closed';
            c.history.push({ date: new Date().toISOString(), status: 'Closed', notes: 'Closed: ' + reason });
            // If system was marked as Under Maintenance/Failed, reset if appropriate? Or let manual override handle it.
            saveDB(db);
            Notifier.show('Ticket Closed', 'Complaint has been officially closed.');
        }
    },

    submitStockRequest: (item, qty, reason) => {
        const db = getDB();
        const user = Auth.getCurrentUser();
        const newRequest = {
            id: 'REQ-' + Math.floor(10000 + Math.random() * 90000),
            itemId: item.id || 'Custom',
            itemName: item.item || item,
            requestedQty: parseInt(qty),
            reason: reason,
            requesterId: user.id,
            requesterName: user.name,
            labId: user.lab,
            status: 'Pending Lab Incharge Approval',
            date: new Date().toISOString(),
            progress: 10,
            history: [{ date: new Date().toISOString(), status: 'Pending Lab Incharge Approval', notes: 'Request submitted by technician.' }]
        };
        db.stockRequests.push(newRequest);
        saveDB(db);
        Notifier.show('Request Submitted', `Stock request for ${newRequest.itemName} sent to Lab Incharge.`);
        return newRequest;
    },

    approveStockRequest: (requestId, approved, notes = '') => {
        const db = getDB();
        const req = db.stockRequests.find(r => r.id === requestId);
        if (req) {
            if (approved) {
                req.status = 'Pending Admin Approval';
                req.progress = 50;
                req.history.push({ date: new Date().toISOString(), status: 'Pending Admin Approval', notes: notes || 'Approved by Lab Incharge.' });
                Notifier.show('Request Approved', 'Stock request forwarded to Admin.');
            } else {
                req.status = 'Rejected';
                req.progress = 100;
                req.history.push({ date: new Date().toISOString(), status: 'Rejected', notes: notes || 'Rejected by Lab Incharge.' });
                Notifier.show('Request Rejected', 'Stock request has been rejected.');
            }
            saveDB(db);
        }
    },

    adminApproveStockRequest: (requestId) => {
        const db = getDB();
        const req = (db.stockRequests || []).find(r => String(r.id) === String(requestId));
        if (req && req.status === 'Pending Admin Approval') {
            req.status = 'Approved';
            req.progress = 75;
            if (!req.history) req.history = [];
            req.history.push({ date: new Date().toISOString(), status: 'Approved', notes: 'Request approved by Admin. Awaiting fulfillment.' });
            saveDB(db);
            Notifier.show('Action Successful', 'Request marked as Approved.');
        }
    },

    fulfillStockRequest: (requestId) => {
        const db = getDB();
        const req = db.stockRequests.find(r => r.id === requestId);
        if (req && (req.status === 'Pending Admin Approval' || req.status === 'Approved')) {
            const inventoryItem = db.inventory.find(i => i.id === req.itemId || i.item === req.itemName);
            if (inventoryItem) {
                inventoryItem.stock += parseInt(req.requestedQty);
                inventoryItem.initialStock += parseInt(req.requestedQty);
            }
            req.status = 'Completed';
            req.progress = 100;
            req.completionDate = new Date().toISOString();
            req.history.push({ date: new Date().toISOString(), status: 'Completed', notes: 'Stock fulfilled and updated in inventory by Admin.' });
            saveDB(db);
            Notifier.show('Request Fulfilled', `Inventory updated for ${req.itemName}.`);
        }
    },

    deductInventory: (complaintId, itemId, qty) => {
        const db = getDB();
        const item = db.inventory.find(i => i.id === itemId);
        const complaint = db.complaints.find(c => c.id === complaintId);
        
        if (!item || item.stock < qty) return { success: false, msg: 'Insufficient Stock' };
        if (!complaint) return { success: false, msg: 'Complaint not found' };

        const timestamp = new Date().toISOString();
        const deductionQty = parseInt(qty);

        // 1. Update Inventory
        item.stock -= deductionQty;
        item.usedStock += deductionQty;

        // 2. Resolve Complaint & Update History
        const logEntry = `Used ${deductionQty}x ${item.item} for repair. System fully restored.`;
        if (!complaint.history) complaint.history = [];
        
        complaint.status = STATUS_RESOLVED;
        complaint.techNotes = logEntry;
        complaint.history.push({ date: timestamp, status: STATUS_RESOLVED, notes: logEntry });
        
        // Append to partsUsed field if exists
        const oldParts = complaint.partsUsed || '';
        complaint.partsUsed = (oldParts ? oldParts + ', ' : '') + `${deductionQty}x ${item.item}`;

        // 3. Update System Status & Maintenance Log
        const sys = db.systems.find(s => s.id === complaint.sys_id);
        if (sys) {
            sys.status = 'Working';
            sys.failures++;
            if (!sys.maintenanceHistory) sys.maintenanceHistory = [];
            sys.maintenanceHistory.push({
                date: timestamp,
                issue: complaint.desc,
                tech: complaint.tech_id || 'Technician',
                notes: logEntry,
                parts: `${deductionQty}x ${item.item}`
            });
        }

        saveDB(db);
        Notifier.show('Inventory Deducted', logEntry);
        return { success: true };
    }
};

// Shared complaint live-tracking helpers
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

window.getComplaintElapsedLabel = function(complaint) {
    const since = getComplaintCurrentStageStart(complaint);
    if (!since) return '00s';
    return formatElapsedDuration(Date.now() - new Date(since).getTime());
};

window.renderComplaintLiveTimer = function(complaint, prefix = 'Live') {
    const since = getComplaintCurrentStageStart(complaint);
    const sinceAttr = since || '';
    const label = window.getComplaintElapsedLabel(complaint);
    return `<span data-live-timer="true" data-since="${sinceAttr}">${prefix}: ${label}</span>`;
};

window.refreshComplaintLiveTimers = function(root = document) {
    root.querySelectorAll('[data-live-timer="true"]').forEach(node => {
        const since = node.getAttribute('data-since');
        if (!since) return;
        const prefix = (node.textContent || 'Live:').split(':')[0] || 'Live';
        const elapsed = formatElapsedDuration(Date.now() - new Date(since).getTime());
        node.textContent = `${prefix}: ${elapsed}`;
    });
};

window.startComplaintLiveTimerLoop = function(intervalMs = 1000) {
    if (window.__complaintTimerLoop) return;
    window.refreshComplaintLiveTimers();
    window.__complaintTimerLoop = window.setInterval(() => {
        window.refreshComplaintLiveTimers();
    }, intervalMs);
};
