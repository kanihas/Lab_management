import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/mongodb.js';
import { captureIpMiddleware, logAudit } from './middleware/audit.js';
import keepAlive from './utils/keepAlive.js';

// Import routes
import authRoutes from './routes/auth.js';
import complaintsRoutes from './routes/complaints.js';
import inventoryRoutes from './routes/inventory.js';
import systemsRoutes from './routes/systems.js';
import stockRequestsRoutes from './routes/stock-requests.js';
import noticesRoutes from './routes/notices.js';
import auditRoutes from './routes/audit.js';
import setupRoutes from './routes/setup.js';

// Load environment variables
dotenv.config();

// Ensure required environment variables are present to avoid confusing runtime errors
const requiredEnvs = ['JWT_SECRET'];
for (const name of requiredEnvs) {
  if (!process.env[name]) {
    console.error(`❌ Required environment variable ${name} is not defined. Set it in your environment (Render dashboard or .env).`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(captureIpMiddleware);
app.use(logAudit);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/systems', systemsRoutes);
app.use('/api/stock-requests', stockRequestsRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/setup', setupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Fallback: send index.html for all other routes (for frontend routing)
app.get('/:file', (req, res) => {
  const file = req.params.file;
  const allowedFiles = [
    'admin.html',
    'staff.html',
    'technician.html',
    'index.html',
  ];

  if (allowedFiles.includes(file)) {
    res.sendFile(path.join(__dirname, `../${file}`));
  } else {
    res.status(404).json({ success: false, message: 'Not found' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n✅ Server running at http://localhost:${PORT}`);
      console.log(`📦 Database: mkce-portal`);
      console.log(`🔐 JWT Enabled for authentication\n`);

      // Start keep-alive service for Render
      keepAlive();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
