import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    sys_id: { type: String, required: true },
    lab_id: { type: String, required: true },
    desc: { type: String, required: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: [
        'Waiting for Lab Incharge Approval',
        'Waiting for Admin Approval',
        'Assigned to Technician',
        'In Progress',
        'Resolved',
        'Closed',
      ],
      default: 'Waiting for Lab Incharge Approval',
    },
    tech_id: String,
    techNotes: String,
    techReply: String,
    partsUsed: String,
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
  { timestamps: true, collection: 'complaints' }
);

export const Complaint = mongoose.model('Complaint', complaintSchema);
