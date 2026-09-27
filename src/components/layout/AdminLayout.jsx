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
  Globe,
  Newspaper
} from 'lucide-react';

const AdminLayout = () => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    // { name: 'SEO & Indexing', path: '/admin/seo-management', icon: Globe },
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
    { name: 'Reporter Apps', path: '/admin/reporter-applications', icon: FileText },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Activity },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: PieChart },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-slate-300 flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Admin <span className="text-red-500">Panel</span></h1>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={closeMobileMenu}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <ul className="space-y-1.5 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/admin'}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600/20 to-transparent text-red-500 border-l-2 border-red-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-sm">
          <button
            onClick={logout}
            className="flex items-center justify-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 group"
          >
            <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Secure Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-slate-600 hover:text-slate-900 bg-slate-100 p-2 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Admin</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Add custom scrollbar styles globally for the sidebar if needed */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  );
};

export default AdminLayout;
