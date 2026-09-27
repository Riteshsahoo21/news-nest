import Role from '../models/Role.js';

export const seedDefaultRoles = async () => {
  try {
    const defaultRoles = [
      {
        name: 'admin',
        displayName: 'Admin',
        permissions: ['manage_users', 'manage_roles', 'manage_content', 'create_content', 'delete_content', 'view_admin_panel', 'manage_categories'],
        isSystem: true
      },
      {
        name: 'editor',
        displayName: 'Editor',
        permissions: ['approve_content', 'create_content', 'view_admin_panel'],
        isSystem: true
      },
      {
        name: 'reporter',
        displayName: 'Reporter',
        permissions: ['create_content'],
        isSystem: true
      },
      {
        name: 'registered_user',
        displayName: 'Registered User',
        permissions: ['comment', 'like', 'bookmark'],
        isSystem: true
      },
      {
        name: 'guest',
        displayName: 'Guest',
        permissions: ['read_only'],
        isSystem: true
      }
    ];

    for (const roleData of defaultRoles) {
      const existing = await Role.findOne({ name: roleData.name });
      if (!existing) {
        await Role.create(roleData);
        console.log(`Seeded default role: ${roleData.name}`);
      }
    }
    console.log('Role seeding complete.');
  } catch (error) {
    console.error('Error seeding default roles:', error);
  }
};
