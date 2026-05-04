import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'staff', 'technician', 'student'],
      required: true,
    },
    d_id: { type: String, required: true },
    lab: { type: String },
    password: { type: String, required: true }, // bcrypt hashed
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'users' }
);

export const User = mongoose.model('User', userSchema);
