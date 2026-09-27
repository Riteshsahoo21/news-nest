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

    // Place Create/Dashboard in the exact center of the nav bar for symmetrical mobile UX
    if (isEditor || isReporter) {
      navItems.splice(2, 0, {
        path: isEditor ? '/editor/dashboard' : '/reporter/dashboard',
        label: isEditor ? 'Dashboard' : 'Create',
        icon: PlusCircle,
        isAction: true
      });
    }
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full max-w-full overflow-hidden bg-card/98 backdrop-blur-lg border-t border-border/80 z-50 px-1 sm:px-2 pb-safe shadow-lg min-w-0">
      <div className="flex items-center justify-around h-16 w-full max-w-full min-w-0">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.isAction) {
            return (
              <Link 
                key={item.label}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 min-w-0 h-full -mt-2.5 px-0.5 group"
              >
                <div className="bg-gradient-to-tr from-red-600 to-red-500 text-white w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-md border-2 border-background flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-red-600 dark:text-red-500 mt-0.5 truncate max-w-full font-mono uppercase tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }
          
          return (
            <Link 
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full py-1.5 px-0.5 transition-colors ${
                isActive ? 'text-red-600 dark:text-red-500 font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 sm:w-5 sm:h-5 shrink-0 transition-transform ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-1 truncate max-w-full ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
