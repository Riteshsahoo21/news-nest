import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Shield, Plus, Save, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AVAILABLE_PERMISSIONS = [
  { id: 'view_admin_panel', label: 'Access Admin Panel', category: 'System' },
  { id: 'manage_users', label: 'Manage Users', category: 'System' },
  { id: 'manage_roles', label: 'Manage Roles', category: 'System' },
  { id: 'manage_categories', label: 'Manage Categories', category: 'Content' },
  { id: 'create_content', label: 'Submit Content', category: 'Content' },
  { id: 'approve_content', label: 'Approve Content', category: 'Content' },
  { id: 'manage_content', label: 'Update Any Content', category: 'Content' },
  { id: 'delete_content', label: 'Delete Any Content', category: 'Content' },
  { id: 'comment', label: 'Post Comments', category: 'Engagement' },
  { id: 'like', label: 'Like Content', category: 'Engagement' },
  { id: 'bookmark', label: 'Bookmark Content', category: 'Engagement' },
  { id: 'read_only', label: 'Read Only', category: 'General' }
];

const RolePermissionManagement = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom role state
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState([]);
  const [newRoleCategories, setNewRoleCategories] = useState([]);

  useEffect(() => {
    fetchRolesAndCategories();
  }, []);

  const fetchRolesAndCategories = async () => {
    try {
      setLoading(true);
      const [rolesRes, catRes] = await Promise.all([
        api.get('/roles'),
        api.get('/categories')
      ]);
      setRoles(rolesRes.data.map(r => ({...r, allowedCategories: r.allowedCategories || []})));
      setCategories(catRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (roleId, permissionId) => {
    setRoles(roles.map(role => {
      if (role._id === roleId) {
        const hasPerm = role.permissions.includes(permissionId);
        const updatedPerms = hasPerm 
          ? role.permissions.filter(p => p !== permissionId)
          : [...role.permissions, permissionId];
        return { ...role, permissions: updatedPerms, isDirty: true };
      }
      return role;
    }));
  };

  const handleToggleCategory = (roleId, categoryName) => {
    setRoles(roles.map(role => {
      if (role._id === roleId) {
        const hasCat = role.allowedCategories?.includes(categoryName);
        const updatedCats = hasCat 
          ? role.allowedCategories.filter(c => c !== categoryName)
          : [...(role.allowedCategories || []), categoryName];
        return { ...role, allowedCategories: updatedCats, isDirty: true };
      }
      return role;
    }));
  };

  const saveRole = async (role) => {
    try {
      setIsSaving(true);
      await api.put(`/roles/${role._id}`, { 
        permissions: role.permissions,
        allowedCategories: role.allowedCategories 
      });
      setRoles(roles.map(r => r._id === role._id ? { ...r, isDirty: false } : r));
      alert(`Permissions for ${role.displayName} updated successfully!`);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the role ${roleName}?`)) return;
    
    try {
      await api.delete(`/roles/${roleId}`);
      setRoles(roles.filter(r => r._id !== roleId));
    } catch (error) {
      console.error('Error deleting role:', error);
      alert(error.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    
    try {
      setIsSaving(true);
      const res = await api.post('/roles', {
        displayName: newRoleName,
        permissions: newRolePerms,
        allowedCategories: newRoleCategories
      });
      setRoles([...roles, { ...res.data, allowedCategories: res.data.allowedCategories || [] }]);
      setShowNewRoleForm(false);
      setNewRoleName('');
      setNewRolePerms([]);
      setNewRoleCategories([]);
    } catch (error) {
      console.error('Error creating role:', error);
      alert(error.response?.data?.error || 'Failed to create role');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            Role & Permission Management
          </h2>
          <p className="text-gray-500 mt-1">Configure exactly what each role can do on the platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {roles.map(role => (
          <Card key={role._id} className="shadow-sm">
            <CardHeader className="py-4 bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {role.displayName}
                  {role.isSystem && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">System</span>
                  )}
                </CardTitle>
              </div>
              <div className="flex gap-2">
                {role.isDirty && (
                  <button 
                    onClick={() => saveRole(role)}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" /> Save
                  </button>
                )}
                {!role.isSystem && (
                  <button 
                    onClick={() => handleDeleteRole(role._id, role.displayName)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-sm rounded hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {AVAILABLE_PERMISSIONS.filter(perm => {
                  // Hide unticked options for the Admin role specifically
                  if (role.name === 'admin' && ['create_content', 'comment', 'like', 'bookmark', 'read_only'].includes(perm.id)) {
                    return false;
                  }
                  // Hide system admin and category management for Editor
                  if (role.name === 'editor' && ['view_admin_panel', 'manage_users', 'manage_roles', 'manage_categories'].includes(perm.id)) {
                    return false;
                  }
                  // Hide system admin, category management, and content management (except submit) for Reporter
                  if (role.name === 'reporter' && ['view_admin_panel', 'manage_users', 'manage_roles', 'manage_categories', 'approve_content', 'manage_content', 'delete_content'].includes(perm.id)) {
                    return false;
                  }
                  // Hide everything except engagement for Registered User
                  if (role.name === 'registered_user' && !['comment', 'like', 'bookmark'].includes(perm.id)) {
                    return false;
                  }
                  // Hide everything except read_only for Guest
                  if (role.name === 'guest' && perm.id !== 'read_only') {
                    return false;
                  }
                  return true;
                }).map(perm => {
                  const hasPerm = role.permissions.includes(perm.id);
                  return (
                    <label 
                      key={perm.id} 
                      className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                        hasPerm ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
                      } cursor-pointer hover:border-red-300`}
                    >
                      <input 
                        type="checkbox"
                        checked={hasPerm}
                        onChange={() => handleTogglePermission(role._id, perm.id)}
                        className="mt-1 rounded text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <p className={`text-sm font-medium ${hasPerm ? 'text-gray-900' : 'text-gray-500'}`}>{perm.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{perm.category}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {(role.permissions.includes('create_content') || role.permissions.includes('approve_content') || role.permissions.includes('manage_content')) && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Allowed Categories (Empty = All Categories)</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const hasCat = role.allowedCategories?.includes(cat.name);
                      return (
                        <label 
                          key={cat._id} 
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            hasCat ? 'border-red-200 bg-red-50 text-red-700 font-medium' : 'border-gray-200 bg-white text-gray-600'
                          } cursor-pointer hover:border-red-300`}
                        >
                          <input 
                            type="checkbox"
                            checked={hasCat || false}
                            onChange={() => handleToggleCategory(role._id, cat.name)}
                            className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                          />
                          {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RolePermissionManagement;
