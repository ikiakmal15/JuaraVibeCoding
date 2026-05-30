import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import api from '../api';
import toast from 'react-hot-toast';

// ── Safe helpers ──────────────────────────────────────────────────
const isBotMsg = (msg) => {
  try {
    return Boolean(msg && (msg.is_bot || (typeof msg.message === 'string' && msg.message.startsWith('[BOT]'))));
  } catch { return false; }
};

const cleanMsgText = (msg) => {
  try {
    if (!msg || typeof msg.message !== 'string') return '';
    return msg.message.replace(/^\[(BOT|AI)\]\s*/, '');
  } catch { return ''; }
};

const formatDate = (str) => {
  try {
    return new Date(str).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
};

const formatPrice = (p) => {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  } catch { return p; }
};

// ── Quick Questions ───────────────────────────────────────────────
const QUICK_QUESTIONS = [
  'Cara booking lapangan?',
  'Berapa harga sewanya?',
  'Jam operasional sampai jam berapa?',
  'Metode pembayaran apa saja?',
  'Fasilitas apa saja?',
  'Dimana lokasinya?',
  'Cara batalkan booking?',
  'Ada promo atau diskon?',
];

// ── Component ─────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const chatEndRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [tab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, botTyping]);

  // ── Data Loading ──────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'bookings') {
        const res = await api.get('/bookings/my');
        setBookings(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'payments') {
        const res = await api.get('/payments/my');
        setPayments(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'chat') {
        await loadChat();
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async () => {
    try {
      const res = await api.get('/chat/messages');
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('loadChat error:', err);
    }
  };

  // ── Send Message ──────────────────────────────────────────────
  const sendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = newMsg.trim();
    if (!text || sending) return;

    setNewMsg('');
    setSending(true);
    setBotTyping(false);

    try {
      // Show bot typing indicator after 400ms
      const typingTimer = setTimeout(() => {
        setBotTyping(true);
      }, 400);

      const res = await api.post('/chat/bot-send', { message: text });

      clearTimeout(typingTimer);
      setBotTyping(false);

      // Response format: { userMsg, botMsg }
      const { userMsg, botMsg } = res.data || {};

      if (userMsg) {
        const newMessages = [userMsg];
        if (botMsg) {
          // Mark as bot so frontend knows how to render it
          newMessages.push({ ...botMsg, is_bot: true });
        }
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        // Fallback: reload all messages
        await loadChat();
      }
    } catch (err) {
      console.error('sendMessage error:', err);
      setBotTyping(false);
      toast.error('Gagal mengirim pesan. Coba lagi.');
      setNewMsg(text); // restore input
    } finally {
      setSending(false);
    }
  };

  const handleQuickQuestion = (q) => {
    setNewMsg(q.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF} ]+/u, '').trim());
  };

  const clearChat = async () => {
    if (!window.confirm('Hapus semua riwayat chat? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setMessages([]);
      toast.success('Chat berhasil dihapus');
    } catch (e) {
      console.error('clearChat error:', e);
      toast.error('Gagal menghapus chat: ' + e.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  const userId = user?.id;

  return (
    <div className="page">
      <div className="container dashboard">
        <h1>Halo, {user?.name?.split(' ')[0]}</h1>
        <p className="subtitle">Kelola booking, pembayaran, dan chat dengan admin</p>

        {/* Tabs */}
        <div className="tabs">
          {[['bookings', 'Booking'], ['payments', 'Pembayaran'], ['chat', 'Live Chat']].map(([key, label]) => (
            <button
              key={key}
              className={`tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <>
            {/* ── BOOKINGS ── */}
            {tab === 'bookings' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <Link to="/courts" className="btn btn-primary">+ Booking Baru</Link>
                </div>
                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon" style={{ fontSize: '2rem', opacity: .3 }}>—</div>
                    <h3>Belum ada booking</h3>
                    <p>Mulai booking lapangan olahraga sekarang!</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {bookings.map(b => (
                      <div key={b.id} className="card" style={{ cursor: 'default' }}>
                        <div className="card-body booking-card-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <h3 className="card-title">{b.court_name}</h3>
                            <div className="court-meta">
                              <span><HiOutlineLocationMarker /> {b.court_location}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: 100 }}>
                            <div style={{ fontSize: '.8rem', color: '#555' }}>Tanggal</div>
                            <div style={{ fontWeight: 700 }}>{b.booking_date}</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: 100 }}>
                            <div style={{ fontSize: '.8rem', color: '#555' }}>Waktu</div>
                            <div style={{ fontWeight: 700 }}>{b.start_time} - {b.end_time}</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: 100 }}>
                            <div style={{ fontSize: '.8rem', color: '#555' }}>Total</div>
                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(b.total_price)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                            {b.status === 'pending' && (
                              <Link to={`/payment/${b.id}`} className="btn btn-success btn-sm">Bayar</Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── PAYMENTS ── */}
            {tab === 'payments' && (
              payments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" style={{ fontSize: '2rem', opacity: .3 }}>—</div>
                  <h3>Belum ada pembayaran</h3>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Lapangan</th><th>Tanggal</th><th>Jumlah</th>
                        <th>Metode</th><th>Status</th><th>Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.court_name}</td>
                          <td>{p.booking_date}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(p.amount)}</td>
                          <td><span className="badge badge-completed">{String(p.payment_method || '').replace('_', ' ').toUpperCase()}</span></td>
                          <td>
                            <span className={`badge badge-${p.payment_status === 'paid' ? 'confirmed' : p.payment_status === 'pending' ? 'pending' : 'cancelled'}`}>
                              {p.payment_status}
                            </span>
                          </td>
                          <td style={{ fontSize: '.8rem', fontFamily: 'var(--font-mono)' }}>{p.transaction_ref}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── CHAT ── */}
            {tab === 'chat' && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', height: 560 }}>

                {/* ── Sidebar: Quick Questions ── */}
                <aside style={{
                  width: 200, flexShrink: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(212,175,55,0.18)',
                  borderRadius: 16, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(212,175,55,0.12)',
                    fontSize: '.68rem', fontWeight: 700,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: 'var(--primary)', background: 'rgba(212,175,55,0.05)',
                  }}>
                    Pertanyaan Cepat
                  </div>
                  {/* Questions list */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQuickQuestion(q)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center',
                          width: '100%', textAlign: 'left',
                          padding: '0 14px', background: 'transparent',
                          border: 'none',
                          borderLeft: '3px solid transparent',
                          borderBottom: i < QUICK_QUESTIONS.length - 1 ? '1px solid rgba(212,175,55,0.07)' : 'none',
                          color: 'var(--text-secondary)', fontSize: '.88rem',
                          cursor: 'pointer', transition: 'all .15s',
                          lineHeight: 1.35,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(212,175,55,0.07)';
                          e.currentTarget.style.color = 'var(--primary)';
                          e.currentTarget.style.borderLeftColor = 'var(--primary)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderLeftColor = 'transparent';
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  {/* Hapus Chat — pinned to bottom */}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(212,175,55,0.12)', flexShrink: 0 }}>
                    <button
                      onClick={clearChat}
                      style={{
                        width: '100%', padding: '9px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8,
                        background: messages.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(100,100,100,0.05)',
                        color: messages.length > 0 ? '#EF4444' : 'var(--text-secondary)',
                        fontSize: '.82rem', fontWeight: 600,
                        cursor: messages.length > 0 ? 'pointer' : 'default',
                        transition: 'all .15s',
                      }}
                      disabled={messages.length === 0}
                      onMouseEnter={e => { if (messages.length > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                      onMouseLeave={e => { if (messages.length > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    >
                      Hapus Chat
                    </button>
                  </div>
                </aside>

                {/* ── Main Chat ── */}
                <div className="chat-wrapper" style={{ flex: 1, minWidth: 0 }}>

                  {/* Header */}
                  <div className="chat-header">
                    <div className="chat-header-info">
                      <div className="chat-avatar" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-.5px' }}>SS</div>
                      <div>
                        <div className="chat-header-name">SportSpace Support</div>
                        <div className="chat-header-status">
                          <span className="status-dot online"></span>
                          Online · Admin aktif 08.00 – 20.00 WIB
                        </div>
                      </div>
                    </div>

                  </div>



                  {/* Messages area */}
                  <div className="chat-messages">

                    {/* Welcome screen when empty */}
                    {messages.length === 0 && !botTyping && (
                      <div className="chat-welcome">
                        <div className="chat-welcome-icon" style={{ fontSize: '1.4rem', fontWeight: 700 }}>SS</div>
                        <h3>Halo! Ada yang bisa dibantu?</h3>
                        <p>Pilih pertanyaan di sidebar atau ketik langsung. Pesan pertama dijawab AI secara instan.</p>
                      </div>
                    )}

                    {/* Message bubbles */}
                    {messages.map((m, idx) => {
                      if (!m) return null;
                      const isMine = m.sender_id === userId;
                      const isBot = isBotMsg(m);
                      const msgKey = m.id != null ? m.id : `msg-${idx}`;
                      const displayText = isMine ? (m.message || '') : cleanMsgText(m);
                      const senderLabel = isBot ? 'SportSpace AI' : isMine ? 'Anda' : (m.sender_name || 'Admin');

                      return (
                        <div
                          key={msgKey}
                          className={`chat-bubble ${isMine ? 'sent' : 'received'} ${isBot ? 'ai-message' : ''}`}
                        >
                          <div className="chat-bubble-meta">{senderLabel}</div>
                          <div className="chat-bubble-text" style={{ whiteSpace: 'pre-line' }}>
                            {displayText}
                          </div>
                          <div className="chat-time">{formatDate(m.created_at)}</div>
                        </div>
                      );
                    })}

                    {/* Bot typing animation */}
                    {botTyping && (
                      <div className="chat-bubble received ai-message">
                        <div className="chat-bubble-meta">SportSpace AI</div>
                        <div className="chat-bubble-text">
                          <div className="typing-dots">
                            <span></span><span></span><span></span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Input form */}
                  <form className="chat-input-area" onSubmit={sendMessage}>
                    <input
                      className="form-input"
                      placeholder={sending ? 'Mengirim...' : 'Ketik pesan...'}
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      autoComplete="off"
                    />
                    <button
                      className="btn btn-primary chat-send-btn"
                      type="submit"
                      disabled={!newMsg.trim() || sending}
                    >
                      {sending ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 14, height: 14,
                            border: '2px solid rgba(255,255,255,.3)',
                            borderTopColor: '#fff',
                            borderRadius: '50%',
                            animation: 'spin .6s linear infinite'
                          }}></div>
                          Kirim
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          Kirim
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
