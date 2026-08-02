import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Shield, ShieldAlert, ShieldCheck, MoreVertical, Trash2, Edit, Search, UserCircle, Plus } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/roles')
      ]);
      
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data);
      } else {
        console.error('Failed to fetch users', usersRes.reason);
      }

      if (rolesRes.status === 'fulfilled') {
        const fetchedRoles = rolesRes.value.data;
        const premiumRole = { _id: 'premium_pseudo', name: 'registered_premium', displayName: 'Registered Premium' };
        const reporterPremiumRole = { _id: 'reporter_premium_pseudo', name: 'reporter_premium', displayName: 'Reporter (Premium Registered)' };
        setRoles([...fetchedRoles, premiumRole, reporterPremiumRole]);
      } else {
        console.error('Failed to fetch roles', rolesRes.reason);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRoles) => {
    try {
      await api.put(`/users/${userId}/role`, { roles: newRoles });
      setUsers(users.map(u => {
        if (u._id === userId) {
          const selected = newRoles[0];
          const isSettingPremium = ['registered_premium', 'reporter_premium'].includes(selected);
          const actualRole = selected === 'registered_premium' ? 'registered_user' : selected === 'reporter_premium' ? 'reporter' : selected;
          return { ...u, roles: [actualRole], role: actualRole, isPremium: isSettingPremium };
        }
        return u;
      }));
    } catch (error) {
      console.error('Failed to update role', error);
      alert(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/users/${userId}/status`, { isActive: !currentStatus });
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (error) {
      console.error('Failed to toggle status', error);
      alert(error.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handleToggleLiveBlogAccess = async (userId, currentAccess) => {
    try {
      await api.put(`/users/${userId}/live-blog-access`, { canManageLiveBlogs: !currentAccess });
      setUsers(users.map(u => u._id === userId ? { ...u, canManageLiveBlogs: !currentAccess } : u));
    } catch (error) {
      console.error('Failed to toggle live blog access', error);
      alert(error.response?.data?.error || 'Failed to toggle live blog access');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  }

  const roleColors = {
    guest: 'bg-gray-100 text-gray-800',
    registered_user: 'bg-blue-50 text-blue-700 border-blue-200',
    registered_premium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    reporter: 'bg-purple-50 text-purple-700 border-purple-200',
    reporter_premium: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300 font-extrabold shadow-2xs',
    editor: 'bg-orange-50 text-orange-700 border-orange-200',
    admin: 'bg-red-50 text-red-700 border-red-200',
  };

  const getRoleColor = (roleName) => roleColors[roleName] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold font-serif text-gray-900 tracking-tight">User Management</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage user roles, permissions, and account statuses across the platform.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-10 pr-4 py-2 bg-gray-50/50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <a 
            href="/admin/add-editor" 
            className="shrink-0 flex items-center justify-center bg-red-600 text-white font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Editor
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50/80 backdrop-blur-sm uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-5 font-semibold">User Details</th>
                <th className="px-6 py-5 font-semibold">Role</th>
                <th className="px-6 py-5 font-semibold">Status</th>
                <th className="px-6 py-5 font-semibold">Live Blog Access</th>
                <th className="px-6 py-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users
                .filter(user => {
                  if (!user) return false;
                  const name = String(user.fullName || '');
                  const email = String(user.email || '');
                  const query = String(searchQuery || '');
                  return name.toLowerCase().includes(query.toLowerCase()) || 
                         email.toLowerCase().includes(query.toLowerCase());
                })
                .map((user) => {
                  const baseRole = (user.roles && user.roles.length > 0) ? user.roles[0] : (user.role || 'registered_user');
                  const currentRole = user.isPremium
                    ? (baseRole === 'registered_user' ? 'registered_premium' : baseRole === 'reporter' ? 'reporter_premium' : baseRole)
                    : baseRole;
                  return (
                <tr key={user._id} className="hover:bg-gray-50/50 transition-colors bg-white group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {user.profilePicture && !user.profilePicture.includes('ui-avatars') ? (
                          <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-gray-500 text-sm">{user.fullName?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">{user.fullName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block w-52">
                      <select
                        value={currentRole}
                        onChange={(e) => handleRoleChange(user._id, [e.target.value])}
                        className={`w-full text-xs font-semibold px-3 py-2 pr-8 rounded-lg border appearance-none focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm hover:opacity-90 transition-all cursor-pointer ${getRoleColor(currentRole)}`}
                      >
                        {roles.map(role => (
                          <option key={role._id} value={role.name}>{role.displayName}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 opacity-60">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border ${user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {user.isActive ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {['reporter', 'reporter_premium'].includes(currentRole) ? (
                      <button
                        onClick={() => handleToggleLiveBlogAccess(user._id, user.canManageLiveBlogs)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 ${
                          user.canManageLiveBlogs
                            ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/20 hover:bg-purple-700'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${user.canManageLiveBlogs ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}`}></span>
                        {user.canManageLiveBlogs ? 'Granted (Click to Revoke)' : 'Disabled (Click to Grant)'}
                      </button>
                    ) : ['admin', 'editor'].includes(currentRole) ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ● Default Access
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Staff Only</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleToggleStatus(user._id, user.isActive)}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all border ${
                        user.isActive 
                          ? 'text-red-600 bg-white border-red-200 hover:bg-red-50 hover:border-red-300' 
                          : 'text-green-600 bg-white border-green-200 hover:bg-green-50 hover:border-green-300'
                      } disabled:opacity-50`}
                    >
                      {user.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
