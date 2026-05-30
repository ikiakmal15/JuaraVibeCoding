import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineCash, HiOutlineCreditCard, HiOutlineQrcode, HiOutlineOfficeBuilding } from 'react-icons/hi';
import api from '../api';
import toast from 'react-hot-toast';

const METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: <HiOutlineCash />, desc: 'Bayar di tempat saat bermain' },
  { id: 'qris', label: 'QRIS', icon: <HiOutlineQrcode />, desc: 'Scan QR untuk pembayaran instan' },
  { id: 'bank_transfer', label: 'Transfer Bank', icon: <HiOutlineOfficeBuilding />, desc: 'Transfer via bank pilihan' },
  { id: 'debit', label: 'Kartu Debit', icon: <HiOutlineCreditCard />, desc: 'Bayar dengan kartu debit' },
];

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [method, setMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const WALLETS = [
    { id: 'gopay', name: 'GoPay', color: '#00AED6', logo: <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#00D5C0"/><path d="M10 18c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="#fff"/></svg> },
    { id: 'ovo', name: 'OVO', color: '#4C3494', logo: <svg width="36" height="36" viewBox="0 0 36 36"><rect rx="8" width="36" height="36" fill="#4C3494"/><text x="18" y="23" textAnchor="middle" fill="#fff" fontFamily="Arial Black" fontWeight="900" fontSize="14">OVO</text></svg> },
    { id: 'dana', name: 'DANA', color: '#108EE9', logo: <svg width="36" height="36" viewBox="0 0 36 36"><rect rx="8" width="36" height="36" fill="#108EE9"/><text x="18" y="22" textAnchor="middle" fill="#fff" fontFamily="Arial Black" fontWeight="900" fontSize="11">DANA</text></svg> },
    { id: 'shopeepay', name: 'ShopeePay', color: '#EE4D2D', logo: <svg width="36" height="36" viewBox="0 0 36 36"><rect rx="8" width="36" height="36" fill="#EE4D2D"/><text x="18" y="22" textAnchor="middle" fill="#fff" fontFamily="Arial" fontWeight="900" fontSize="18">S</text><rect x="10" y="24" width="16" height="3" rx="1.5" fill="#fff" opacity=".7"/></svg> },
    { id: 'linkaja', name: 'LinkAja', color: '#E42313', logo: <svg width="36" height="36" viewBox="0 0 36 36"><rect rx="8" width="36" height="36" fill="#E42313"/><circle cx="18" cy="14" r="5" fill="#fff"/><path d="M12 28c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#fff"/></svg> },
    { id: 'bca_mb', name: 'BCA Mobile', color: '#003D79', logo: <svg width="36" height="36" viewBox="0 0 36 36"><rect rx="8" width="36" height="36" fill="#003D79"/><text x="18" y="22" textAnchor="middle" fill="#fff" fontFamily="Arial Black" fontWeight="900" fontSize="11">BCA</text></svg> },
    { id: 'bni_mb', name: 'BNI Mobile', color: '#F26522', logo: <svg width="36" height="36" viewBox="0 0 36 36"><rect rx="8" width="36" height="36" fill="#F26522"/><text x="18" y="22" textAnchor="middle" fill="#fff" fontFamily="Arial Black" fontWeight="900" fontSize="12">BNI</text></svg> },
  ];

  useEffect(() => {
    api.get('/bookings/my').then(res => {
      const b = res.data.find(x => x.id === parseInt(bookingId));
      if (b) setBooking(b); else navigate('/user-dashboard');
    }).catch(() => navigate('/user-dashboard')).finally(() => setLoading(false));
  }, [bookingId]);

  const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!method) { toast.error('Pilih metode pembayaran'); return; }
    setSubmitting(true);
    try {
      const data = { booking_id: parseInt(bookingId), payment_method: method };
      if (method === 'bank_transfer') data.bank_name = bankName;
      if (method === 'debit') data.card_last_four = cardNum.slice(-4);
      await api.post('/payments', data);
      toast.success('Pembayaran berhasil! 🎉');
      navigate('/user-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Pembayaran gagal');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>;
  if (!booking) return null;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <h1>💳 Pembayaran</h1>
        <p className="subtitle">Pilih metode pembayaran untuk booking kamu</p>

        <div style={{ background: 'var(--accent-yellow)', border: '3px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{booking.court_name}</div>
          <div style={{ fontSize: '.9rem', color: '#555' }}>📅 {booking.booking_date} | ⏰ {booking.start_time} - {booking.end_time}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: 8 }}>{formatPrice(booking.total_price)}</div>
        </div>

        <form onSubmit={handlePay}>
          <div className="form-label" style={{ marginBottom: 12 }}>Pilih Metode Pembayaran</div>
          <div className="payment-methods">
            {METHODS.map(m => (
              <div key={m.id} className={`payment-method ${method === m.id ? 'selected' : ''}`} onClick={() => setMethod(m.id)}>
                <div className="pm-icon">{m.icon}</div>
                <div>{m.label}</div>
                <div style={{ fontSize: '.7rem', fontWeight: 400, marginTop: 4, textTransform: 'none' }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {method === 'bank_transfer' && (
            <div className="form-group">
              <label className="form-label">Nama Bank</label>
              <select className="form-input" value={bankName} onChange={e => setBankName(e.target.value)} required>
                <option value="">Pilih Bank</option>
                <option value="BCA">BCA</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="Mandiri">Mandiri</option>
              </select>
            </div>
          )}

          {method === 'debit' && (
            <div className="form-group">
              <label className="form-label">Nomor Kartu</label>
              <input className="form-input" placeholder="xxxx xxxx xxxx xxxx" value={cardNum} onChange={e => setCardNum(e.target.value)} required maxLength={19} />
            </div>
          )}

          {method === 'qris' && (
            <div style={{ background: '#fff', border: '3px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16, overflow: 'hidden' }}>
              {/* Midtrans-style Header */}
              <div style={{ background: '#002855', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="#00D4FF"/><text x="14" y="18" textAnchor="middle" fill="#002855" fontWeight="900" fontSize="12" fontFamily="Arial">M</text></svg>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '.95rem', fontFamily: 'var(--font-mono)' }}>Midtrans Payment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="50" height="18" viewBox="0 0 50 18"><text x="0" y="14" fontFamily="Arial Black" fontSize="12" fontWeight="900"><tspan fill="#1A56DB">QR</tspan><tspan fill="#FF4444">IS</tspan></text></svg>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }}></div>
                </div>
              </div>

              {/* QR Code Area */}
              <div style={{ textAlign: 'center', padding: '24px 20px' }}>
                <div style={{ width: 220, height: 220, margin: '0 auto', padding: 14, background: '#fff', border: '3px solid #eee', borderRadius: 12 }}>
                  <svg viewBox="0 0 200 200" width="100%" height="100%">
                    <rect x="10" y="10" width="50" height="50" fill="none" stroke="#1A1A1A" strokeWidth="6"/>
                    <rect x="22" y="22" width="26" height="26" fill="#1A1A1A"/>
                    <rect x="140" y="10" width="50" height="50" fill="none" stroke="#1A1A1A" strokeWidth="6"/>
                    <rect x="152" y="22" width="26" height="26" fill="#1A1A1A"/>
                    <rect x="10" y="140" width="50" height="50" fill="none" stroke="#1A1A1A" strokeWidth="6"/>
                    <rect x="22" y="152" width="26" height="26" fill="#1A1A1A"/>
                    {[70,80,90,100,110,120].map(x => [70,80,90,100,110,120,130,140,150,160,170].map(y => (
                      (x+y) % 20 < 15 && <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" fill="#1A1A1A" rx="1"/>
                    )))}
                    {[10,20,30,40,50,60].map(x => [70,80,90,100,110,120].map(y => (
                      (x*y) % 17 < 10 && <rect key={`h${x}-${y}`} x={x} y={y} width="8" height="8" fill="#1A1A1A" rx="1"/>
                    )))}
                    {[70,80,90,100,110,120,130].map(x => [10,20,30,40,50,60].map(y => (
                      (x+y*3) % 19 < 11 && <rect key={`v${x}-${y}`} x={x} y={y} width="8" height="8" fill="#1A1A1A" rx="1"/>
                    )))}
                    {[140,150,160,170,180].map(x => [70,80,90,100,110,120,130,140,150,160,170,180].map(y => (
                      (x*y+x) % 23 < 13 && <rect key={`r${x}-${y}`} x={x} y={y} width="8" height="8" fill="#1A1A1A" rx="1"/>
                    )))}
                    {[10,20,30,40,50,60,70,80,90,100,110,120,130].map(x => [140,150,160,170,180].map(y => (
                      (x+y*2) % 21 < 12 && <rect key={`b${x}-${y}`} x={x} y={y} width="8" height="8" fill="#1A1A1A" rx="1"/>
                    )))}
                    <rect x="72" y="72" width="56" height="56" rx="10" fill="#002855"/>
                    <circle cx="100" cy="100" r="18" fill="#00D4FF"/>
                    <text x="100" y="106" textAnchor="middle" fill="#002855" fontWeight="900" fontSize="14" fontFamily="Arial">M</text>
                  </svg>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem' }}>SportSpace</div>
                  <div style={{ fontSize: '.75rem', color: '#888', marginTop: 2 }}>Merchant ID: MID-SS2024001</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ padding: '0 20px' }}><div style={{ borderTop: '2px dashed #ddd' }}></div></div>

              {/* Selectable E-Wallets */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: '#555' }}>Pilih E-Wallet / Bank</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {WALLETS.map(w => (
                    <div key={w.id} onClick={() => setSelectedWallet(w.id)} style={{
                      padding: '12px 8px', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'center',
                      border: selectedWallet === w.id ? `3px solid ${w.color}` : '3px solid #eee',
                      background: selectedWallet === w.id ? `${w.color}15` : '#fff',
                      transform: selectedWallet === w.id ? 'translate(-2px, -2px)' : 'none',
                      boxShadow: selectedWallet === w.id ? `3px 3px 0px ${w.color}` : 'none',
                      transition: 'all .15s'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{w.logo}</div>
                      <div style={{ fontSize: '.7rem', fontWeight: 700, color: selectedWallet === w.id ? w.color : '#555' }}>{w.name}</div>
                    </div>
                  ))}
                </div>
                {selectedWallet && <div style={{ marginTop: 10, padding: '8px 12px', background: '#F0FFF4', border: '2px solid #4ADE80', borderRadius: 'var(--radius)', fontSize: '.8rem', fontWeight: 600, color: '#166534' }}>✅ Scan QR menggunakan {WALLETS.find(w=>w.id===selectedWallet)?.name}</div>}
              </div>

              {/* Footer */}
              <div style={{ background: '#f8f8f8', borderTop: '2px solid #eee', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '.7rem', color: '#888' }}>Powered by Midtrans</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: '.65rem', padding: '2px 6px', background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>🔒 Secure</span>
                  <span style={{ fontSize: '.65rem', padding: '2px 6px', background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>PCI DSS</span>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting || !method}>
            {submitting ? 'Memproses...' : method === 'cod' ? 'Konfirmasi COD' : 'Bayar Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
