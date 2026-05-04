import mongoose from 'mongoose';

const labSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    d_id: { type: String, required: true },
    name: { type: String, required: true },
    room: String,
    maintainer: String,
    systems: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'labs' }
);

export const Lab = mongoose.model('Lab', labSchema);
