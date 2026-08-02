import { Link, useLocation } from 'react-router-dom';
import { Home, Radio, PlaySquare, Image as ImageIcon, User, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/live-blogs', label: 'Live Blogs', icon: Radio },
    { path: '/videos', label: 'Videos', icon: PlaySquare },
    { path: '/photo-gallery', label: 'Gallery', icon: ImageIcon },
    { path: isAuthenticated ? '/profile' : '/login', label: 'Profile', icon: User },
  ];

  const userPermissions = user?.permissions || [];
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  
  if (isAuthenticated) {
    const isEditor = userRoles.some(r => ['editor', 'admin'].includes(r)) || 
                     userPermissions.some(p => ['approve_content', 'manage_content', 'delete_content'].includes(p));
                     
    const isReporter = userRoles.includes('reporter') || 
                       userPermissions.includes('create_content');

    // Add floating action button if they have editor or reporter permissions
    if (isEditor || isReporter) {
      navItems.push({
        path: isEditor ? '/editor/dashboard' : '/reporter/dashboard',
        label: isEditor ? 'Dashboard' : 'Create',
        icon: PlusCircle,
        isAction: true
      });
    }
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 px-2 pb-safe">
      <div className="flex items-center justify-between h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.isAction) {
            return (
              <Link 
                key={item.label}
                to={item.path}
                className="flex flex-col items-center justify-center w-full h-full -mt-5"
              >
                <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg border-4 border-background flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-primary mt-1">{item.label}</span>
              </Link>
            );
          }
          
          return (
            <Link 
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
