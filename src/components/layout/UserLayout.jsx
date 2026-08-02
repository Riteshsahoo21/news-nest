import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import BottomNav from './BottomNav';
import Footer from '../Footer';
import StickyMobileAd from '../ads/StickyMobileAd';
import { useAuth } from '../../context/AuthContext';

const UserLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Redirect system admins away from public pages
  if (isAuthenticated && user) {
    const userRoles = user.roles || (user.role ? [user.role] : []);
    const userPermissions = user.permissions || [];
    
    const isSystemAdmin = userRoles.some(r => ['admin'].includes(r)) || userPermissions.includes('view_admin_panel');
    
    // Only redirect if they are not already trying to go to an admin page, 
    // though UserLayout shouldn't handle admin routes anyway.
    if (isSystemAdmin) {
      return <Navigate to="/admin" replace />;
    }
  }
  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden w-full">
      <Navbar />
      {/* Main content area needs bottom padding on mobile to avoid overlap with BottomNav */}
      <main className="flex-1 pb-16 md:pb-0 flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <StickyMobileAd />
      <BottomNav />
    </div>
  );
};

export default UserLayout;
