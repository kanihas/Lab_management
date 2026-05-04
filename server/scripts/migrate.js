import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Lab } from '../models/Lab.js';
import { System } from '../models/System.js';
import { Complaint } from '../models/Complaint.js';
import { Inventory } from '../models/Inventory.js';
import { Notice } from '../models/Notice.js';
import { StockRequest } from '../models/StockRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../utils/password.js';

dotenv.config();

// Data from app.js
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

const DEFAULT_LOGIN_PASSWORD = '12345678';

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

const migrate = async () => {
  try {
    console.log('🔄 Starting migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Clear existing collections
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Lab.deleteMany({}),
      System.deleteMany({}),
      Complaint.deleteMany({}),
      Inventory.deleteMany({}),
      Notice.deleteMany({}),
      StockRequest.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('✅ Collections cleared\n');

    // Migrate Departments
    console.log('📝 Migrating departments...');
    const department = await Department.create({
      id: 'ECE',
      name: 'Electronics & Communication Eng.',
      createdBy: 'MIGRATION',
      updatedBy: 'MIGRATION',
    });
    console.log(`✅ Migrated 1 department\n`);

    // Migrate Labs
    console.log('📝 Migrating labs...');
    const labs = await Lab.insertMany(
      CANONICAL_LABS.map((lab) => ({
        ...lab,
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      }))
    );
    console.log(`✅ Migrated ${labs.length} labs\n`);

    // Migrate Systems
    console.log('📝 Migrating systems...');
    const systems = await System.insertMany(
      buildSystemsForLabs(CANONICAL_LABS).map((sys) => ({
        ...sys,
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      }))
    );
    console.log(`✅ Migrated ${systems.length} systems\n`);

    // Migrate Users (with password hashing)
    console.log('📝 Migrating users...');
    const hashedPassword = await hashPassword(DEFAULT_LOGIN_PASSWORD);

    const userstoMigrate = [
      {
        id: '114210',
        name: 'Admin',
        role: 'admin',
        d_id: 'ECE',
        password: hashedPassword,
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      },
      ...CANONICAL_STAFF_USERS.map((u) => ({
        ...u,
        password: hashedPassword,
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      })),
      ...CANONICAL_TECH_USERS.map((u) => ({
        ...u,
        password: hashedPassword,
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      })),
    ];

    const users = await User.insertMany(userstoMigrate);
    console.log(`✅ Migrated ${users.length} users (passwords hashed)\n`);

    // Migrate Inventory
    console.log('📝 Migrating inventory...');
    const inventory = await Inventory.insertMany(
      INVENTORY_DATA.map((item) => ({
        ...item,
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      }))
    );
    console.log(`✅ Migrated ${inventory.length} inventory items\n`);

    // Migrate Notice
    console.log('📝 Migrating notices...');
    const notice = await Notice.create({
      id: 1,
      dept: 'ECE',
      author: 'HOD',
      message: 'Welcome to the MKCE System Status Portal. All operations are live.',
      date: new Date(),
      createdBy: 'MIGRATION',
      updatedBy: 'MIGRATION',
    });
    console.log(`✅ Migrated 1 notice\n`);

    // Migrate sample complaints
    console.log('📝 Migrating sample complaints...');
    const complaints = await Complaint.insertMany([
      {
        id: 'ECE-TKT-7135',
        sys_id: 'PC-NL-05',
        lab_id: 'NL',
        desc: 'Monitor flickering issue',
        priority: 'Medium',
        status: 'In Progress',
        date: new Date(),
        tech_id: '114216',
        history: [
          {
            date: new Date(),
            status: 'In Progress',
            notes: 'Issue reported and assigned to technician',
          },
        ],
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      },
      {
        id: 'ECE-TKT-8857',
        sys_id: 'PC-DSP-05',
        lab_id: 'DSP',
        desc: 'System not booting',
        priority: 'High',
        status: 'Assigned to Technician',
        date: new Date(),
        tech_id: '114218',
        history: [
          {
            date: new Date(),
            status: 'Assigned to Technician',
            notes: 'Awaiting technician action',
          },
        ],
        createdBy: 'MIGRATION',
        updatedBy: 'MIGRATION',
      },
    ]);
    console.log(`✅ Migrated ${complaints.length} sample complaints\n`);

    // Create migration audit entry
    console.log('📝 Creating migration audit log...');
    await AuditLog.create({
      action: 'MIGRATE',
      collection: 'users',
      documentId: 'MIGRATION',
      userId: 'SYSTEM',
      userName: 'SYSTEM',
      userRole: 'system',
      description: 'Data migrated from localStorage to MongoDB',
      status: 'success',
      timestamp: new Date(),
    });
    console.log(`✅ Created migration audit entry\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Departments: 1`);
    console.log(`   - Labs: ${labs.length}`);
    console.log(`   - Systems: ${systems.length}`);
    console.log(`   - Inventory Items: ${inventory.length}`);
    console.log(`   - Sample Complaints: ${complaints.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
