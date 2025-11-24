import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'DASHBOARD' },
  { path: '/', label: 'NEW REQUEST' },
  { path: '/requests', label: 'APPROVALS' }
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-block">
          <p className="brand-title">Kanona Power Company Portal</p>
        </div>
        <nav className="main-nav">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-chip">
          <div>
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{user?.role.replaceAll('_', ' ')}</p>
          </div>
          <button className="ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
