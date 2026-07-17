import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripeSessionId: {
    type: String,
    required: true,
  },
  planName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'inr',
  },
  status: {
    type: String,
    enum: ['paid', 'failed', 'pending'],
    default: 'paid',
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
