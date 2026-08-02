import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [], requiredPermissions = [] }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const userPermissions = user?.permissions || [];
  
  let hasRoleAccess = true;
  if (allowedRoles.length > 0) {
    hasRoleAccess = allowedRoles.some(r => userRoles.includes(r));
  }

  let hasPermissionAccess = true;
  if (requiredPermissions.length > 0) {
    hasPermissionAccess = requiredPermissions.some(p => userPermissions.includes(p));
  }

  // We allow access if they have the right role OR the right permission
  if (!hasRoleAccess && !hasPermissionAccess) {
    return <Navigate to="/" replace />; // Redirect to home if unauthorized
  }

  return <Outlet />;
};

export default ProtectedRoute;
