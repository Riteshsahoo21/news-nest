import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Tags, 
  Image as ImageIcon, 
  PieChart, 
  Mail, 
  Megaphone, 
  Settings, 
  FileText,
  Files,
  LogOut,
  Menu,
  X,
  CreditCard,
  UserPlus,
  Bell,
  Activity,
  Tag,
  DollarSign,
  User,
  Globe
} from 'lucide-react';

const AdminLayout = () => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'SEO & Indexing', path: '/admin/seo-management', icon: Globe },
    { name: 'My Profile', path: '/admin/profile', icon: User },
    { name: 'Editorial Approvals', path: '/admin/approvals', icon: FileText },
    { name: 'Content Management', path: '/admin/content', icon: Files },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Add Editor', path: '/admin/add-editor', icon: UserPlus },
    { name: 'Role & Permission', path: '/admin/roles', icon: ShieldCheck },
    { name: 'Category Management', path: '/admin/categories', icon: Tags },
    // { name: 'Polls', path: '/admin/polls', icon: PieChart },
    { name: 'Newsletter', path: '/admin/newsletter', icon: Mail },
    { name: 'Advertisement', path: '/admin/ads', icon: Megaphone },
    { name: 'Notifications', path: '/admin/broadcast-notifications', icon: Bell },
    { name: 'Subscription Plans', path: '/admin/subscription-plans', icon: CreditCard },
    { name: 'Coupons', path: '/admin/coupons', icon: Tag },
    { name: 'Revenue Reports', path: '/admin/revenue', icon: DollarSign },
    { name: 'Reporter Apps', path: '/admin/reporter-applications', icon: FileText },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Activity },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
    // { name: 'Reports', path: '/admin/reports', icon: FileText },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-600">Admin Panel</h1>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={closeMobileMenu}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/admin'}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold text-red-600">Admin Panel</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
