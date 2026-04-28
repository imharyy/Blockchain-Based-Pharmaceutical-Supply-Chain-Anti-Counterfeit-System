import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLinks = {
    admin: [
      { to: '/dashboard', label: '📊 Dashboard' },
      { to: '/dashboard/stakeholders', label: '👥 Stakeholders' },
    ],
    manufacturer: [
      { to: '/dashboard', label: '📊 Dashboard' },
      { to: '/dashboard/create-batch', label: '➕ New Batch' },
    ],
    distributor: [
      { to: '/dashboard', label: '📊 Dashboard' },
    ],
    pharmacy: [
      { to: '/dashboard', label: '📊 Dashboard' },
    ],
    consumer: [
      { to: '/dashboard', label: '📊 Dashboard' },
      { to: '/verify', label: '🔍 Verify Medicine' },
    ],
  };

  const links = roleLinks[user?.role] || [];

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand" style={{ textDecoration: 'none' }}>
        <span className="brand-icon">⛓️</span>
        <span>PharmaChain</span>
      </Link>

      <div className="navbar-menu">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="btn btn-ghost btn-sm">
            {link.label}
          </Link>
        ))}
        <Link to="/verify" className="btn btn-ghost btn-sm">🔍 Verify</Link>
      </div>

      {user && (
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-name">{user.username}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
