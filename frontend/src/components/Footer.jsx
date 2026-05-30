import { Link, NavLink } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';

export default function Footer() {
  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? '#D4AF37' : 'rgba(240,237,232,0.5)',
    fontWeight: isActive ? 600 : 400,
    borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
    paddingLeft: isActive ? 8 : 0,
    transition: 'all .2s',
    fontSize: '.88rem',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  });

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">Sport<span>Space</span></Link>
            <p>Platform terpercaya untuk booking lapangan olahraga di Indonesia. Futsal, badminton, tenis, basket, padel &amp; lebih banyak lagi.</p>
          </div>
          <div className="footer-links">
            <h4>Menu</h4>
            <NavLink to="/" end style={navLinkStyle}>Home</NavLink>
            <NavLink to="/courts" style={navLinkStyle}>Lapangan</NavLink>
            <NavLink to="/my-bookings" style={navLinkStyle}>Booking Saya</NavLink>
            <NavLink to="/register" style={navLinkStyle}>Daftar</NavLink>
          </div>
          <div className="footer-links">
            <h4>Kontak</h4>
            <a href="https://maps.google.com/?q=Depok,Indonesia" target="_blank" rel="noopener noreferrer">
              <HiOutlineLocationMarker /> Depok, Indonesia
            </a>
            <a href="mailto:rifqnur06@gmail.com">
              <HiOutlineMail /> rifqnur06@gmail.com
            </a>
            <a href="tel:+6282310377071">
              <HiOutlinePhone /> +62 823 1037 7071
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} <Link to="/">SportSpace</Link> — Platform Booking Lapangan Olahraga. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
