import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">TimeSheet</span>

        <nav className="navbar-nav">
          {user.role === 'admin' ? (
            <>
              <Link to="/admin" className={`nav-link${isActive('/admin') ? ' active' : ''}`}>Review</Link>
              <Link to="/admin/reports" className={`nav-link${isActive('/admin/reports') ? ' active' : ''}`}>Reports</Link>
              <Link to="/admin/users" className={`nav-link${isActive('/admin/users') ? ' active' : ''}`}>Users</Link>
            </>
          ) : (
            <Link to="/" className={`nav-link${isActive('/') ? ' active' : ''}`}>My Timesheets</Link>
          )}
        </nav>

        <div className="navbar-user">
          <span className="navbar-username">{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
