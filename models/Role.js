import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{ 
    type: String 
  }],
  allowedCategories: [{
    type: String // empty array means global access to all categories
  }],
  isSystem: { 
    type: Boolean, 
    default: false 
  } // System roles cannot be deleted
}, { timestamps: true });

export default mongoose.model('Role', roleSchema);
