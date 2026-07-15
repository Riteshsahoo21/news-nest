import Role from '../models/Role.js';

// Get all roles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// Create a custom role
export const createRole = async (req, res) => {
  try {
    const { displayName, permissions, allowedCategories } = req.body;
    if (!displayName) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const name = displayName.toLowerCase().replace(/\s+/g, '_');
    
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ error: 'Role already exists' });
    }

    const newRole = new Role({
      name,
      displayName,
      permissions: permissions || [],
      allowedCategories: allowedCategories || [],
      isSystem: false
    });

    await newRole.save();
    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// Update role permissions
export const updateRole = async (req, res) => {
  try {
    const { permissions, allowedCategories } = req.body;
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Update permissions
    if (permissions) role.permissions = permissions;
    if (allowedCategories !== undefined) role.allowedCategories = allowedCategories;
    await role.save();
    
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// Delete a custom role
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot delete a system role' });
    }

    // TODO: Ideally check if users are currently assigned to this role before deleting
    // For now, simple delete
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
};
