import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    dept: { type: String, required: true },
    author: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'notices' }
);

export const Notice = mongoose.model('Notice', noticeSchema);
