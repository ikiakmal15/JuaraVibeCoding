import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiMenu, HiX } from 'react-icons/hi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">Sport<span>Space</span></Link>
        <button className="mobile-toggle" onClick={() => setOpen(!open)}>
          {open ? <HiX /> : <HiMenu />}
        </button>
        <div className={`navbar-links ${open ? 'open' : ''}`}>
          <Link to="/" className={isActive('/')} onClick={() => setOpen(false)}>Home</Link>
          <Link to="/courts" className={isActive('/courts')} onClick={() => setOpen(false)}>Lapangan</Link>
          {user ? (
            <>
              {user.role === 'admin' ? (
                <Link to="/admin" className={isActive('/admin')} onClick={() => setOpen(false)}>Dashboard Admin</Link>
              ) : (
                <>
                  <Link to="/my-bookings" className={isActive('/my-bookings')} onClick={() => setOpen(false)}>Booking Saya</Link>
                  <Link to="/user-dashboard" className={isActive('/user-dashboard')} onClick={() => setOpen(false)}>Dashboard</Link>
                </>
              )}
              <Link to="/profile" className={`nav-profile-link ${isActive('/profile')}`} onClick={() => setOpen(false)}>
                <span className="nav-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                {user.name?.split(' ')[0]}
              </Link>
              <button className="nav-btn-logout" onClick={() => { logout(); setOpen(false); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')} onClick={() => setOpen(false)}>Masuk</Link>
              <Link to="/register" className="nav-btn-primary" onClick={() => setOpen(false)}>Daftar</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
