import mongoose from 'mongoose';

const reporterApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
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
    photoUrl: {
      type: String,
      required: true, // Passport size photo
    },
    idType: {
      type: String,
      enum: ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving Licence', 'Voter ID'],
      required: true,
    },
    idDocumentUrl: {
      type: String,
      required: true, // PDF of the ID
    },
    bio: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    }
  },
  { timestamps: true }
);

const ReporterApplication = mongoose.model('ReporterApplication', reporterApplicationSchema);
export default ReporterApplication;
