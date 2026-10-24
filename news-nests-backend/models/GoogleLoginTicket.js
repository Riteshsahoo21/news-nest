import mongoose from 'mongoose';

const googleLoginTicketSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

export default mongoose.model('GoogleLoginTicket', googleLoginTicketSchema);
