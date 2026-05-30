import { useState, useEffect } from 'react';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import api from '../api';
import toast from 'react-hot-toast';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const cancelBooking = async (id) => {
    if (!confirm('Yakin ingin membatalkan booking ini?')) return;
    try {
      await api.put(`/bookings/${id}/cancel`);
      toast.success('Booking dibatalkan');
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal membatalkan'); }
  };

  const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <div className="loading" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="container dashboard">
        <h1>Booking Saya</h1>
        <p className="subtitle">Kelola semua booking lapangan olahraga kamu</p>

        <div className="tabs">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button key={s} className={`tab-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'Semua' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Belum ada booking</h3>
            <p>Mulai booking lapangan olahraga sekarang!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filtered.map(b => (
              <div key={b.id} className="card" style={{ cursor: 'default' }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 className="card-title">{b.court_name}</h3>
                    <div className="court-meta">
                      <span><HiOutlineLocationMarker /> {b.court_location}</span>
                      <span className={`badge badge-${b.court_type === 'indoor' ? 'completed' : 'pending'}`}>{b.court_type}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tanggal</div>
                    <div style={{ fontWeight: 600 }}>{b.booking_date}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Waktu</div>
                    <div style={{ fontWeight: 600 }}>{b.start_time} - {b.end_time}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total</div>
                    <div style={{ fontWeight: 700, color: '#FF6B35' }}>{formatPrice(b.total_price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b.id)}>Batalkan</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
