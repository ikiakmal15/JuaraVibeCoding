import { useState, useEffect, useRef } from 'react';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineCalendar, HiOutlineCash, HiOutlinePlus, HiOutlinePhotograph } from 'react-icons/hi';
import api from '../api';
import toast from 'react-hot-toast';

const API_BASE = ''; // Vite proxies /uploads → localhost:5000

export default function AdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourt, setEditCourt] = useState(null);
  const [courtForm, setCourtForm] = useState({
    name: '', description: '', location: '', price_per_hour: '',
    court_type: 'indoor', sport_type: 'futsal', facilities: '', image_url: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageDragOver, setImageDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => { loadData(); }, [tab]);
  useEffect(() => {
    if (tab === 'chat' && selectedChatUser) {
      const i = setInterval(() => loadChatMessages(selectedChatUser), 3000);
      return () => clearInterval(i);
    }
  }, [tab, selectedChatUser]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleChatScroll = (e) => {
    const el = e.target;
    const threshold = 80;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') { const r = await api.get('/bookings/admin/stats'); setStats(r.data); }
      else if (tab === 'courts') { const r = await api.get('/courts/admin/all'); setCourts(r.data); }
      else if (tab === 'bookings') { const r = await api.get('/bookings/admin/all'); setBookings(r.data); }
      else if (tab === 'payments') { const r = await api.get('/payments/admin/all'); setPayments(r.data); }
      else if (tab === 'chat') { const r = await api.get('/chat/messages'); setChatUsers(r.data); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadChatMessages = async (userId) => {
    try { const r = await api.get(`/chat/messages?user_id=${userId}`); setChatMessages(r.data); } catch (e) {}
  };

  const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const openAddCourt = () => {
    setEditCourt(null);
    setCourtForm({ name: '', description: '', location: '', price_per_hour: '', court_type: 'indoor', sport_type: 'futsal', facilities: '', image_url: '' });
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const openEditCourt = (c) => {
    setEditCourt(c);
    setCourtForm({ name: c.name, description: c.description || '', location: c.location, price_per_hour: c.price_per_hour, court_type: c.court_type, sport_type: c.sport_type || 'futsal', facilities: c.facilities || '', image_url: c.image_url || '' });
    setImageFile(null);
    if (c.image_url) {
      setImagePreview(c.image_url.startsWith('/uploads/') ? `${API_BASE}${c.image_url}` : c.image_url);
    } else {
      setImagePreview('');
    }
    setShowModal(true);
  };

  const handleImageChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diizinkan!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB!');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setCourtForm(f => ({ ...f, image_url: '' })); // clear URL jika upload file
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setImageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageChange(file);
  };

  const saveCourt = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editCourt) {
        // Update data dulu
        const data = { ...courtForm, price_per_hour: parseFloat(courtForm.price_per_hour) };
        await api.put(`/courts/${editCourt.id}`, data);

        // Upload gambar jika ada file baru
        if (imageFile) {
          const formData = new FormData();
          formData.append('image', imageFile);
          await api.post(`/courts/${editCourt.id}/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        toast.success('Lapangan diperbarui! ✅');
      } else {
        // Tambah baru — jika ada file, pakai endpoint /with-image
        if (imageFile) {
          const formData = new FormData();
          formData.append('image', imageFile);
          formData.append('name', courtForm.name);
          formData.append('description', courtForm.description);
          formData.append('location', courtForm.location);
          formData.append('price_per_hour', courtForm.price_per_hour);
          formData.append('court_type', courtForm.court_type);
          formData.append('sport_type', courtForm.sport_type);
          formData.append('facilities', courtForm.facilities);
          await api.post('/courts/with-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          const data = { ...courtForm, price_per_hour: parseFloat(courtForm.price_per_hour) };
          await api.post('/courts', data);
        }
        toast.success('Lapangan ditambahkan! 🏆');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setUploading(false);
    }
  };

  const deleteCourt = async (id) => {
    if (!confirm('Hapus lapangan ini?')) return;
    try { await api.delete(`/courts/${id}`); toast.success('Dihapus'); loadData(); }
    catch (e) { toast.error('Gagal menghapus'); }
  };

  const updateBookingStatus = async (id, status) => {
    try { await api.put(`/bookings/${id}/status`, { status }); toast.success(`Status: ${status}`); loadData(); }
    catch (e) { toast.error('Gagal'); }
  };

  const sendAdminMsg = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedChatUser) return;
    try {
      await api.post('/chat/send', { message: newMsg, receiver_id: selectedChatUser });
      setNewMsg('');
      isAtBottomRef.current = true;
      await loadChatMessages(selectedChatUser);
    } catch (e) { toast.error('Gagal kirim'); }
  };

  return (
    <div className="page">
      <div className="container dashboard">
        <h1>🛡️ Admin Dashboard</h1>
        <p className="subtitle">Kelola lapangan, booking, pembayaran, dan chat</p>

        <div className="tabs">
          {[['dashboard', 'Stats'], ['courts', 'Lapangan'], ['bookings', 'Booking'], ['payments', 'Payment'], ['chat', 'Chat']].map(([k, l]) => (
            <button key={k} className={`tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {loading ? <div className="loading"><div className="spinner"></div></div> : (
          <>
            {tab === 'dashboard' && stats && (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-icon"><HiOutlineOfficeBuilding /></div><div className="stat-value">{stats.totalCourts}</div><div className="stat-label">Lapangan</div></div>
                  <div className="stat-card"><div className="stat-icon"><HiOutlineUsers /></div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Users</div></div>
                  <div className="stat-card"><div className="stat-icon"><HiOutlineCalendar /></div><div className="stat-value">{stats.totalBookings}</div><div className="stat-label">Booking</div></div>
                  <div className="stat-card"><div className="stat-icon"><HiOutlineCash /></div><div className="stat-value">{formatPrice(stats.totalRevenue)}</div><div className="stat-label">Pendapatan</div></div>
                </div>
                {stats.recentBookings?.length > 0 && (
                  <div className="table-wrapper">
                    <table><thead><tr><th>User</th><th>Lapangan</th><th>Tanggal</th><th>Waktu</th><th>Status</th></tr></thead>
                    <tbody>{stats.recentBookings.map(b => (
                      <tr key={b.id}><td>{b.user_name}</td><td>{b.court_name}</td><td>{b.booking_date}</td><td>{b.start_time}-{b.end_time}</td><td><span className={`badge badge-${b.status}`}>{b.status}</span></td></tr>
                    ))}</tbody></table>
                  </div>
                )}
              </>
            )}

            {tab === 'courts' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={openAddCourt}><HiOutlinePlus /> Tambah</button>
                </div>
                <div className="table-wrapper">
                  <table><thead><tr><th>Foto</th><th>Nama</th><th>Lokasi</th><th>Olahraga</th><th>Tipe</th><th>Harga/Jam</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody>{courts.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', flexShrink: 0 }}>
                          {c.image_url ? (
                            <img
                              src={c.image_url.startsWith('/uploads/') ? `${API_BASE}${c.image_url}` : c.image_url}
                              alt={c.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>🏸</div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{c.name}</td><td>{c.location}</td>
                      <td>
                        {(() => {
                          const SPORT_EMOJIS = { futsal: '⚽', mini_soccer: '🥅', soccer: '🏟️', badminton: '🏸', tennis: '🎾', padel: '🏓', basketball: '🏀', golf: '⛳', baseball: '⚾' };
                          const SPORT_COLORS = { futsal: '#22C55E', mini_soccer: '#16A34A', soccer: '#15803D', badminton: '#3B82F6', tennis: '#EAB308', padel: '#8B5CF6', basketball: '#F97316', golf: '#10B981', baseball: '#EF4444' };
                          const SPORT_NAMES = { futsal: 'Futsal', mini_soccer: 'Mini Soccer', soccer: 'Sepak Bola', badminton: 'Badminton', tennis: 'Tenis', padel: 'Padel', basketball: 'Basket', golf: 'Golf', baseball: 'Baseball' };
                          const st = c.sport_type || 'futsal';
                          return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: `${SPORT_COLORS[st] || '#D4AF37'}22`, border: `1px solid ${SPORT_COLORS[st] || '#D4AF37'}55`, color: SPORT_COLORS[st] || '#D4AF37', fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{SPORT_EMOJIS[st] || '🏆'} {SPORT_NAMES[st] || st}</span>;
                        })()}
                      </td>
                      <td><span className={`badge ${c.court_type === 'indoor' ? 'badge-completed' : 'badge-pending'}`}>{c.court_type === 'indoor' ? '🏢' : '🌳'} {c.court_type}</span></td>
                      <td>{formatPrice(c.price_per_hour)}</td>
                      <td><span className={`badge ${c.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>{c.is_active ? 'Aktif' : 'Off'}</span></td>
                      <td><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-secondary btn-sm" onClick={() => openEditCourt(c)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => deleteCourt(c.id)}>Hapus</button></div></td>
                    </tr>
                  ))}</tbody></table>
                </div>
              </>
            )}

            {tab === 'bookings' && (
              <div className="table-wrapper">
                <table><thead><tr><th>User</th><th>Lapangan</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>{bookings.map(b => (
                  <tr key={b.id}>
                    <td><div style={{ fontWeight: 700 }}>{b.user_name}</div><div style={{ fontSize: '.8rem', color: '#555' }}>{b.user_email}</div></td>
                    <td>{b.court_name}</td><td>{b.booking_date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(b.total_price)}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td><select className="filter-select" style={{ fontSize: '.8rem', padding: '6px 10px' }} value={b.status} onChange={e => updateBookingStatus(b.id, e.target.value)}>
                      <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                    </select></td>
                  </tr>
                ))}</tbody></table>
              </div>
            )}

            {tab === 'payments' && (
              <div className="table-wrapper">
                <table><thead><tr><th>User</th><th>Lapangan</th><th>Jumlah</th><th>Metode</th><th>Status</th><th>Ref</th></tr></thead>
                <tbody>{payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.user_name}</td><td>{p.court_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(p.amount)}</td>
                    <td><span className="badge badge-completed">{p.payment_method.replace('_', ' ').toUpperCase()}</span></td>
                    <td><span className={`badge badge-${p.payment_status === 'paid' ? 'confirmed' : 'pending'}`}>{p.payment_status}</span></td>
                    <td style={{ fontSize: '.75rem', fontFamily: 'var(--font-mono)' }}>{p.transaction_ref}</td>
                  </tr>
                ))}</tbody></table>
              </div>
            )}

            {tab === 'chat' && (
              <div className="admin-chat-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, minHeight: 520 }}>
                {/* User List */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(212,175,55,0.15)', fontWeight: 700, fontFamily: 'Poppins', textTransform: 'uppercase', fontSize: '.75rem', letterSpacing: '1px', color: 'var(--primary)', background: 'rgba(212,175,55,0.06)' }}>
                    💬 Users
                  </div>
                  {chatUsers.length === 0
                    ? <div style={{ padding: 24, color: 'var(--text-secondary)', textAlign: 'center', fontSize: '.9rem' }}>Belum ada chat masuk</div>
                    : chatUsers.map(u => (
                        <div key={u.id} onClick={() => { setSelectedChatUser(u.id); loadChatMessages(u.id); }}
                          style={{ padding: '14px 16px', borderBottom: '1px solid rgba(212,175,55,0.08)', cursor: 'pointer', background: selectedChatUser === u.id ? 'rgba(212,175,55,0.12)' : 'transparent', transition: 'all .2s', borderLeft: selectedChatUser === u.id ? '3px solid var(--primary)' : '3px solid transparent' }}>
                          <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {u.name}
                            {u.unread_count > 0 && <span style={{ background: '#EF4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '.68rem', fontWeight: 700 }}>{u.unread_count}</span>}
                          </div>
                          <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.last_message}</div>
                        </div>
                      ))
                  }
                </div>

                {/* Chat Area */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {!selectedChatUser ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: 12 }}>
                      <div style={{ fontSize: '2.5rem', opacity: .4 }}>💬</div>
                      <div style={{ fontWeight: 600, fontSize: '.95rem' }}>Pilih user untuk membalas pesan</div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="chat-messages"
                        ref={chatContainerRef}
                        onScroll={handleChatScroll}
                        style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg)', maxHeight: 400 }}
                      >
                        {chatMessages.map(m => (
                          <div key={m.id} className={`chat-bubble ${m.sender_role === 'admin' ? 'sent' : 'received'}`}>
                            <div className="chat-bubble-meta">{m.sender_name}</div>
                            <div className="chat-bubble-text">{m.message}</div>
                            <span className="chat-time">{new Date(m.created_at).toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <form className="chat-input-area" onSubmit={sendAdminMsg}>
                        <input className="form-input" placeholder="Balas pesan..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
                        <button className="btn btn-primary chat-send-btn" type="submit">Kirim</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Modal Tambah/Edit Lapangan ── */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '95%' }}>
              <h2 style={{ marginBottom: 20 }}>{editCourt ? '✏️ Edit Lapangan' : '🏸 Tambah Lapangan'}</h2>
              <form onSubmit={saveCourt}>

                {/* ── Upload Foto Section ── */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HiOutlinePhotograph style={{ fontSize: '1.1rem' }} /> Foto Lapangan
                  </label>

                  {/* Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setImageDragOver(true); }}
                    onDragLeave={() => setImageDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${imageDragOver ? 'var(--primary)' : 'rgba(212,175,55,0.35)'}`,
                      borderRadius: 12,
                      padding: imagePreview ? 0 : '28px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: imageDragOver ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.03)',
                      transition: 'all .25s',
                      overflow: 'hidden',
                      position: 'relative',
                      minHeight: imagePreview ? 180 : 'auto',
                    }}
                  >
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', borderRadius: 10 }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          justifyContent: 'center', opacity: 0, transition: 'opacity .2s',
                          borderRadius: 10, color: '#fff', fontSize: '.9rem', gap: 6,
                          cursor: 'pointer',
                        }}
                          className="img-overlay-hover"
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <HiOutlinePhotograph style={{ fontSize: '1.8rem' }} />
                          <span>Ganti Foto</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '2.2rem', marginBottom: 8, opacity: .6 }}>📸</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--primary)' }}>Klik</strong> atau <strong style={{ color: 'var(--primary)' }}>drag & drop</strong> foto lapangan<br />
                          <span style={{ fontSize: '.78rem', opacity: .7 }}>JPG, PNG, WebP — maks 5MB</span>
                        </div>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleImageChange(e.target.files[0])}
                  />

                  {/* OR: URL input */}
                  {!imageFile && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>— atau masukkan URL gambar —</div>
                      <input
                        className="form-input"
                        value={courtForm.image_url}
                        onChange={e => {
                          setCourtForm({ ...courtForm, image_url: e.target.value });
                          setImagePreview(e.target.value);
                        }}
                        placeholder="https://example.com/foto-lapangan.jpg"
                        style={{ fontSize: '.85rem' }}
                      />
                    </div>
                  )}

                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(editCourt?.image_url ? (editCourt.image_url.startsWith('/uploads/') ? `${API_BASE}${editCourt.image_url}` : editCourt.image_url) : ''); }}
                      style={{ marginTop: 8, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '.82rem', textDecoration: 'underline' }}
                    >
                      ✕ Hapus file pilihan
                    </button>
                  )}
                </div>

                <div className="form-group"><label className="form-label">Nama Lapangan *</label><input className="form-input" value={courtForm.name} onChange={e => setCourtForm({ ...courtForm, name: e.target.value })} required placeholder="Contoh: Arena Futsal Senayan" /></div>
                <div className="form-group"><label className="form-label">Lokasi *</label><input className="form-input" value={courtForm.location} onChange={e => setCourtForm({ ...courtForm, location: e.target.value })} required placeholder="Contoh: Jakarta Selatan" /></div>
                <div className="form-group"><label className="form-label">Harga / Jam (Rp) *</label><input type="number" className="form-input" value={courtForm.price_per_hour} onChange={e => setCourtForm({ ...courtForm, price_per_hour: e.target.value })} required placeholder="150000" /></div>

                {/* Jenis Olahraga Picker */}
                <div className="form-group">
                  <label className="form-label">🏆 Jenis Olahraga *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                    {[
                      { v: 'futsal',      l: 'Futsal',      e: '⚽', c: '#22C55E' },
                      { v: 'mini_soccer', l: 'Mini Soccer',  e: '🥅', c: '#16A34A' },
                      { v: 'soccer',      l: 'Sepak Bola',   e: '🏟️', c: '#059669' },
                      { v: 'badminton',   l: 'Badminton',    e: '🏸', c: '#3B82F6' },
                      { v: 'tennis',      l: 'Tenis',        e: '🎾', c: '#EAB308' },
                      { v: 'padel',       l: 'Padel',        e: '🏓', c: '#8B5CF6' },
                      { v: 'basketball',  l: 'Basket',       e: '🏀', c: '#F97316' },
                      { v: 'golf',        l: 'Golf',         e: '⛳', c: '#10B981' },
                      { v: 'baseball',    l: 'Baseball',     e: '⚾', c: '#EF4444' },
                    ].map(sp => {
                      const on = courtForm.sport_type === sp.v;
                      return (
                        <button key={sp.v} type="button" onClick={() => setCourtForm({ ...courtForm, sport_type: sp.v })} style={{
                          padding: '10px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                          border: `2px solid ${on ? sp.c : 'rgba(212,175,55,0.2)'}`,
                          background: on ? `${sp.c}22` : 'transparent',
                          color: on ? sp.c : 'var(--text-secondary)',
                          transition: 'all .15s', fontWeight: on ? 700 : 400,
                        }}>
                          <div style={{ fontSize: '1.3rem' }}>{sp.e}</div>
                          <div style={{ fontSize: '.7rem', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.l}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Indoor / Outdoor */}
                <div className="form-group">
                  <label className="form-label">🏢 Tipe Lapangan *</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {[{ v: 'indoor', l: 'Indoor', e: '🏢', c: '#3B82F6' }, { v: 'outdoor', l: 'Outdoor', e: '🌳', c: '#22C55E' }].map(t => {
                      const on = courtForm.court_type === t.v;
                      return (
                        <button key={t.v} type="button" onClick={() => setCourtForm({ ...courtForm, court_type: t.v })} style={{
                          flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                          border: `2px solid ${on ? t.c : 'rgba(212,175,55,0.2)'}`,
                          background: on ? `${t.c}22` : 'transparent',
                          color: on ? t.c : 'var(--text-secondary)',
                          fontWeight: on ? 700 : 400, transition: 'all .15s', fontSize: '.9rem',
                        }}>
                          <span style={{ fontSize: '1.4rem', display: 'block' }}>{t.e}</span>
                          {t.l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-input" rows="3" value={courtForm.description} onChange={e => setCourtForm({ ...courtForm, description: e.target.value })} placeholder="Deskripsikan fasilitas dan keunggulan lapangan ini..." /></div>
                <div className="form-group"><label className="form-label">Fasilitas (pisah koma)</label><input className="form-input" value={courtForm.facilities} onChange={e => setCourtForm({ ...courtForm, facilities: e.target.value })} placeholder="WiFi, AC, Parkir, Shower, Loker..." /></div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? '⏳ Menyimpan...' : (editCourt ? '✅ Simpan Perubahan' : `➕ Tambah Lapangan ${courtForm.sport_type ? courtForm.sport_type.replace('_', ' ').toUpperCase() : ''}`)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
