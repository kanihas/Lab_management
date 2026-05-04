import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    item: { type: String, required: true },
    initialStock: { type: Number, default: 0 },
    usedStock: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Good', 'In Stock', 'Low Stock', 'Out of Stock'],
      default: 'Good',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, collection: 'inventory' }
);

export const Inventory = mongoose.model('Inventory', inventorySchema);
