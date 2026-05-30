import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Courts from './pages/Courts';
import CourtDetail from './pages/CourtDetail';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Payment from './pages/Payment';
import Profile from './pages/Profile';

function ProtectedRoute({ children, adminOnly = false, userOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  if (userOnly && user.role === 'admin') return <Navigate to="/admin" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 70px - 80px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/courts" element={<Courts />} />
          <Route path="/courts/:id" element={<CourtDetail />} />
          <Route path="/my-bookings" element={<ProtectedRoute userOnly><MyBookings /></ProtectedRoute>} />
          <Route path="/user-dashboard" element={<ProtectedRoute userOnly><UserDashboard /></ProtectedRoute>} />
          <Route path="/payment/:bookingId" element={<ProtectedRoute userOnly><Payment /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-right" toastOptions={{
        style: { background: '#FFF', color: '#1A1A1A', border: '2px solid #1A1A1A', boxShadow: '3px 3px 0px #1A1A1A', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 },
      }} />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
