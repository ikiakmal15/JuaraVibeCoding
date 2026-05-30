import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

const SPORT_IMAGES = {
  futsal:      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80',
  mini_soccer: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  soccer:      'https://images.unsplash.com/photo-1551958219-acbc3e5d90e7?w=800&q=80',
  tennis:      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80',
  badminton:   'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',
  padel:       'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
  golf:        'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80',
  baseball:    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80',
  basketball:  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
};
// Always use admin-set image first; only fall back to sport image if none set
const getCourtImage = (court) => {
  if (court.image_url && court.image_url.trim() !== '' && court.image_url !== '/images/default-court.jpg') {
    return court.image_url;
  }
  return SPORT_IMAGES[court.sport_type] || SPORT_IMAGES.futsal;
};

export default function CourtDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);

  useEffect(() => {
    api.get(`/courts/${id}`).then(r => setCourt(r.data)).catch(() => navigate('/courts')).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (bookingDate && id) api.get(`/bookings/slots/${id}/${bookingDate}`).then(r => setBookedSlots(r.data)).catch(() => {});
  }, [bookingDate, id]);

  const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const calcDuration = () => { if (!startTime || !endTime) return 0; const [sh,sm]=startTime.split(':').map(Number); const [eh,em]=endTime.split(':').map(Number); return (eh+em/60)-(sh+sm/60); };
  const duration = calcDuration();
  const totalPrice = duration > 0 && court ? duration * court.price_per_hour : 0;
  const today = new Date().toISOString().split('T')[0];

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (user.role === 'admin') { toast.error('Admin tidak bisa booking'); return; }
    if (duration <= 0) { toast.error('Waktu tidak valid'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/bookings', { court_id: parseInt(id), booking_date: bookingDate, start_time: startTime, end_time: endTime, notes });
      toast.success('Booking berhasil! 🎉');
      navigate(`/payment/${res.data.booking.id}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Booking gagal'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>;
  if (!court) return null;

  return (
    <div className="detail-page">
      <div className="container">
        <div className="detail-grid">
          <div>
            <div className="detail-image">
              <img src={getCourtImage(court)} alt={court.name} />
            </div>
            <div style={{ marginTop: 24 }}>
              <h1>{court.name}</h1>
              <div className="detail-location"><HiOutlineLocationMarker /> {court.location}</div>
              <div className="detail-price">{formatPrice(court.price_per_hour)} <small style={{ color: '#555' }}>/ jam</small></div>
              <span className={`badge ${court.court_type === 'indoor' ? 'badge-confirmed' : 'badge-pending'}`} style={{ marginBottom: 16, display: 'inline-block' }}>{court.court_type}</span>
              <p className="detail-desc">{court.description}</p>
              {court.facilities && (
                <>
                  <h3 style={{ marginBottom: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Fasilitas</h3>
                  <div className="facilities-list">
                    {court.facilities.split(',').map((f, i) => <span key={i} className="facility-tag">{f.trim()}</span>)}
                  </div>
                </>
              )}
              {bookedSlots.length > 0 && bookingDate && (
                <>
                  <h3 style={{ marginBottom: 12, fontFamily: 'var(--font-mono)' }}>Jadwal Terisi ({bookingDate})</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {bookedSlots.map((s, i) => <span key={i} className="facility-tag" style={{ background: '#FEE2E2', borderColor: '#E53E3E' }}>{s.start_time} - {s.end_time}</span>)}
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="booking-card">
              <h2>📅 Booking Lapangan</h2>
              <form onSubmit={handleBooking}>
                <div className="form-group"><label className="form-label">Tanggal</label><input type="date" className="form-input" min={today} value={bookingDate} onChange={e => setBookingDate(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Waktu Mulai</label><input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Waktu Selesai</label><input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-input" rows="3" placeholder="Opsional..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
                {duration > 0 && (
                  <div className="booking-summary">
                    <div className="booking-summary-row"><span>Durasi</span><span>{duration} jam</span></div>
                    <div className="booking-summary-row"><span>Harga/jam</span><span>{formatPrice(court.price_per_hour)}</span></div>
                    <div className="booking-summary-row"><span>Total</span><span>{formatPrice(totalPrice)}</span></div>
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting || (user?.role === 'admin')}>
                  {submitting ? 'Memproses...' : !user ? 'Login untuk Booking' : user.role === 'admin' ? 'Admin tidak bisa booking' : 'Booking & Bayar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
