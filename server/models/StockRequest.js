import mongoose from 'mongoose';

const stockRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    itemId: String,
    itemName: { type: String, required: true },
    labId: { type: String, required: true },
    requestedQty: { type: Number, required: true },
    reason: String,
    requesterId: String,
    requesterName: String,
    status: {
      type: String,
      enum: [
        'Pending Lab Incharge Approval',
        'Pending Admin Approval',
        'Approved',
        'Completed',
        'Rejected',
      ],
      default: 'Pending Lab Incharge Approval',
    },
    progress: { type: Number, default: 10 },
    completionDate: Date,
    history: [
      {
        date: { type: Date, default: Date.now },
        status: String,
        notes: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'stockRequests' }
);

export const StockRequest = mongoose.model('StockRequest', stockRequestSchema);
