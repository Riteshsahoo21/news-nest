import mongoose from 'mongoose';

const editorDetailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  idType: {
    type: String,
    enum: ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving Licence', 'Voter ID'],
    required: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  idDocumentUrl: {
    type: String,
    required: true,
  },
  // New Extended Details
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  
  emergencyContactName: { type: String, required: true },
  emergencyContactPhone: { type: String, required: true },
  
  linkedInUrl: { type: String, default: '' },
  twitterUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('EditorDetail', editorDetailSchema);
