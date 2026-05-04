import express from 'express';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Lab } from '../models/Lab.js';
import { System } from '../models/System.js';
import { Inventory } from '../models/Inventory.js';
import { Notice } from '../models/Notice.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../utils/password.js';

const router = express.Router();

const CANONICAL_STAFF_USERS = [
  { id: '114211', name: 'Ramya R', role: 'staff', d_id: 'ECE', lab: 'NL' },
  { id: '114212', name: 'Dr. K.Jegatheesan', role: 'staff', d_id: 'ECE', lab: 'EMP' },
  { id: '114213', name: 'Dr. C.Nandagopal', role: 'staff', d_id: 'ECE', lab: 'PL' },
  { id: '114214', name: 'Dr. P.Jeyakumar', role: 'staff', d_id: 'ECE', lab: 'DSP' },
  { id: '114215', name: 'Dr. K.Karthikeyan', role: 'staff', d_id: 'ECE', lab: 'PCB' },
];

const CANONICAL_TECH_USERS = [
  { id: '114216', name: 'Ramya R', role: 'technician', d_id: 'ECE', lab: 'NL' },
  { id: '114217', name: 'Keerthana S', role: 'technician', d_id: 'ECE', lab: 'PCB' },
  { id: '114218', name: 'Chandrahasan S', role: 'technician', d_id: 'ECE', lab: 'DSP' },
  { id: '114219', name: 'Durairasu A', role: 'technician', d_id: 'ECE', lab: 'EMP' },
  { id: '114220', name: 'Malar M', role: 'technician', d_id: 'ECE', lab: 'PL' },
];

const CANONICAL_LABS = [
  { id: 'NL', d_id: 'ECE', name: 'Network Lab', room: 'APJ122', maintainer: 'Ramya R', systems: 30 },
  { id: 'EMP', d_id: 'ECE', name: 'EMP Lab', room: 'APJ235', maintainer: 'Dr. K. Jegatheesan', systems: 12 },
  { id: 'PL', d_id: 'ECE', name: 'Project Lab', room: 'APJ227', maintainer: 'Dr. C. Nandagopal', systems: 13 },
  { id: 'DSP', d_id: 'ECE', name: 'DSP Lab', room: 'APJ217', maintainer: 'Dr. P. Jeyakumar', systems: 64 },
  { id: 'PCB', d_id: 'ECE', name: 'PCB Lab', room: 'APJ238', maintainer: 'Dr. K. Karthikeyan', systems: 37 },
];

const INVENTORY_DATA = [
  { id: 'I1', item: 'LED Monitor (24")', initialStock: 100, usedStock: 40, stock: 60, status: 'Good' },
  { id: 'I2', item: 'RAM (8GB DDR4)', initialStock: 200, usedStock: 80, stock: 120, status: 'Good' },
  { id: 'I3', item: 'Mechanical Keyboard', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' },
  { id: 'I4', item: 'Optical Mouse', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' },
  { id: 'I5', item: 'SMPS (450W)', initialStock: 60, usedStock: 20, stock: 40, status: 'In Stock' },
  { id: 'I6', item: 'SATA/HDMI Cables', initialStock: 300, usedStock: 100, stock: 200, status: 'Good' },
  { id: 'I7', item: 'CMOS Batteries', initialStock: 100, usedStock: 50, stock: 50, status: 'Good' },
  { id: 'I8', item: 'CPU (Processor)', initialStock: 200, usedStock: 44, stock: 156, status: 'Good' },
];

function buildSystemsForLabs(labs) {
  const systems = [];
  labs.forEach((lab) => {
    for (let j = 1; j <= Number(lab.systems || 0); j++) {
      const sysId = `PC-${lab.id}-${j.toString().padStart(2, '0')}`;
      systems.push({
        id: sysId,
        lab_id: lab.id,
        status: 'Working',
        failures: 0,
        maintenanceHistory: [],
      });
    }
  });
  return systems;
}

// ONE-TIME MIGRATION ENDPOINT (DELETE AFTER USING!)
router.post('/setup-database', async (req, res) => {
  try {
    console.log('🔄 Starting database setup...');

    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Database already populated! This endpoint runs only once.',
      });
    }

    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Lab.deleteMany({}),
      System.deleteMany({}),
      Inventory.deleteMany({}),
      Notice.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // Migrate Departments
    await Department.create({
      id: 'ECE',
      name: 'Electronics & Communication Eng.',
      createdBy: 'SETUP',
      updatedBy: 'SETUP',
    });

    // Migrate Labs
    await Lab.insertMany(
      CANONICAL_LABS.map((lab) => ({
        ...lab,
        createdBy: 'SETUP',
        updatedBy: 'SETUP',
      }))
    );

    // Migrate Systems
    await System.insertMany(
      buildSystemsForLabs(CANONICAL_LABS).map((sys) => ({
        ...sys,
        createdBy: 'SETUP',
        updatedBy: 'SETUP',
      }))
    );

    // Migrate Users
    const hashedPassword = await hashPassword('12345678');
    const usersToMigrate = [
      {
        id: '114210',
        name: 'Admin',
        role: 'admin',
        d_id: 'ECE',
        password: hashedPassword,
        createdBy: 'SETUP',
        updatedBy: 'SETUP',
      },
      ...CANONICAL_STAFF_USERS.map((u) => ({
        ...u,
        password: hashedPassword,
        createdBy: 'SETUP',
        updatedBy: 'SETUP',
      })),
      ...CANONICAL_TECH_USERS.map((u) => ({
        ...u,
        password: hashedPassword,
        createdBy: 'SETUP',
        updatedBy: 'SETUP',
      })),
    ];

    await User.insertMany(usersToMigrate);

    // Migrate Inventory
    await Inventory.insertMany(
      INVENTORY_DATA.map((item) => ({
        ...item,
        createdBy: 'SETUP',
        updatedBy: 'SETUP',
      }))
    );

    // Migrate Notice
    await Notice.create({
      id: 1,
      dept: 'ECE',
      author: 'HOD',
      message: 'Welcome to the MKCE System Status Portal. All operations are live.',
      date: new Date(),
      createdBy: 'SETUP',
      updatedBy: 'SETUP',
    });

    console.log('✅ Database setup complete!');

    res.json({
      success: true,
      message: '✅ Database populated successfully!',
      data: {
        users: usersToMigrate.length,
        labs: CANONICAL_LABS.length,
        systems: buildSystemsForLabs(CANONICAL_LABS).length,
        inventory: INVENTORY_DATA.length,
      },
    });
  } catch (error) {
    console.error('Setup Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
