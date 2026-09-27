import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import BottomNav from './BottomNav';
import Footer from '../Footer';
import StickyMobileAd from '../ads/StickyMobileAd';
import { useAuth } from '../../context/AuthContext';

const UserLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated && user) {
    const userRoles = user.roles || (user.role ? [user.role] : []);
    const userPermissions = user.permissions || [];
    const isSystemAdmin = userRoles.some(r => ['admin'].includes(r)) || userPermissions.includes('view_admin_panel');
    if (isSystemAdmin) {
      return <Navigate to="/admin" replace />;
    }
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden w-full max-w-full min-w-0">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0 flex flex-col w-full max-w-full overflow-x-hidden min-w-0">
        <Outlet />
      </main>
      <Footer />
      <StickyMobileAd />
      <BottomNav />
    </div>
  );
};

export default UserLayout;
