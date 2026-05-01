import mongoose from 'mongoose';

const systemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lab_id: { type: String, required: true },
    status: {
      type: String,
      enum: ['Working', 'Under Maintenance', 'Failed', 'In Stock'],
      default: 'Working',
    },
    failures: { type: Number, default: 0 },
    maintenanceHistory: [
      {
        date: { type: Date, default: Date.now },
        issue: String,
        tech: String,
        notes: String,
        parts: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'systems' }
);

export const System = mongoose.model('System', systemSchema);
