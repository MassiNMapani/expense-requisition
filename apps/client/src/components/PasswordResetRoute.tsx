import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function PasswordResetRoute() {
  const { user, loading, requiresPasswordChange } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!requiresPasswordChange) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
