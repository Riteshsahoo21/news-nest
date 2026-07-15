import User from '../models/User.js';
import Role from '../models/Role.js';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID (Admin only)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    // We can accept 'role' for backwards compatibility, but prefer 'roles'
    const roles = req.body.roles || (req.body.role ? [req.body.role] : []);
    
    if (roles.length === 0) {
      return res.status(400).json({ error: 'At least one role must be provided' });
    }
    
    // Validate roles dynamically
    const validRoleDocs = await Role.find({ name: { $in: roles } });
    const validRoleNames = validRoleDocs.map(r => r.name);
    
    const invalidRoles = roles.filter(r => !validRoleNames.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ error: `Invalid roles provided: ${invalidRoles.join(', ')}` });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Use findByIdAndUpdate to bypass validation of other fields (like missing fullName in legacy records)
    await User.findByIdAndUpdate(id, { roles, role: roles[0] }, { runValidators: false });
    
    res.json({ message: 'User roles updated successfully', user: { id: targetUser._id, roles } });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle user active status (Admin only)
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent an admin from disabling themselves
    if (targetUser._id.toString() === req.user.id) {
      return res.status(403).json({ error: 'Cannot disable your own account' });
    }

    // Use findByIdAndUpdate to bypass validation of other fields (like missing fullName in legacy records)
    await User.findByIdAndUpdate(id, { isActive }, { runValidators: false });
    
    res.json({ message: `User account ${isActive ? 'activated' : 'disabled'}`, user: { id: targetUser._id, isActive } });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new staff member (reporter/editor) (Admin only)
export const addStaff = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, email, password, and role are required' });
    }

    const validRoles = ['reporter', 'editor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be reporter or editor' });
    }

    // 1. Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 2. Create user in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: fullName,
        phoneNumber: mobileNumber ? (mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`) : undefined,
      });
    } catch (firebaseError) {
      console.error('Firebase create user error:', firebaseError);
      return res.status(400).json({ error: firebaseError.message || 'Failed to create user in Firebase' });
    }

    // 3. Hash password for local DB (even though Firebase handles auth, keeping a hashed copy if needed for local fallback)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create user in MongoDB
    const newUser = await User.create({
      _id: firebaseUser.uid, // Use Firebase UID as MongoDB _id to keep them in sync
      fullName,
      email,
      mobileNumber,
      password: hashedPassword,
      roles: [role],
      role, // legacy fallback
      authProvider: 'local'
    });

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
