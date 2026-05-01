import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'departments' }
);

export const Department = mongoose.model('Department', departmentSchema);
