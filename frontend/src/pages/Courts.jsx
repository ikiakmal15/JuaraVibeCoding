import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineSearch } from 'react-icons/hi';
import api from '../api';

const SPORT_TYPES = [
  { value: '',            label: 'Semua',      color: '#D4AF37' },
  { value: 'futsal',      label: 'Futsal',      color: '#22C55E' },
  { value: 'mini_soccer', label: 'Mini Soccer', color: '#10B981' },
  { value: 'soccer',      label: 'Sepak Bola',  color: '#06B6D4' },
  { value: 'badminton',   label: 'Badminton',   color: '#3B82F6' },
  { value: 'tennis',      label: 'Tenis',       color: '#EAB308' },
  { value: 'padel',       label: 'Padel',       color: '#8B5CF6' },
  { value: 'basketball',  label: 'Basket',      color: '#F97316' },
  { value: 'golf',        label: 'Golf',        color: '#84CC16' },
  { value: 'baseball',    label: 'Baseball',    color: '#EF4444' },
];

const SPORT_MAP = Object.fromEntries(SPORT_TYPES.map(s => [s.value, s]));

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

const getCourtImage = (court) => {
  if (court.image_url && court.image_url.trim() !== '' && court.image_url !== '/images/default-court.jpg') {
    return court.image_url;
  }
  return SPORT_IMAGES[court.sport_type] || SPORT_IMAGES.futsal;
};

export default function Courts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { fetchCourts(); }, [search, sportFilter, typeFilter]);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (sportFilter) params.sport_type = sportFilter;
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/courts', { params });
      setCourts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fmt = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const activeSport = SPORT_MAP[sportFilter] || SPORT_TYPES[0];
  const hasFilter = sportFilter || typeFilter || search;

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(212,175,55,0.12)',
        paddingTop: 40, paddingBottom: 32,
        marginBottom: 0,
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 800, margin: 0,
              background: 'linear-gradient(135deg, #F0EDE8, #D4AF37)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Pilih Lapangan Olahraga</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '.95rem' }}>
              Temukan &amp; booking lapangan favoritmu dengan mudah
            </p>
          </div>

          {/* ── Search bar ── */}
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(212,175,55,0.3)',
              borderRadius: 50, padding: '10px 20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              <HiOutlineSearch style={{ color: 'var(--primary)', fontSize: '1.2rem', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Cari nama lapangan atau kota..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '.95rem',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                  width: 22, height: 22, cursor: 'pointer', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem',
                }}>✕</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SIDEBAR + CONTENT LAYOUT
      ══════════════════════════════════════════ */}
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div className="courts-layout" style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* ── LEFT SIDEBAR ── */}
          <aside className="courts-sidebar" style={{
            width: 220,
            flexShrink: 0,
            position: 'sticky',
            top: 88,
            background: 'var(--bg-card)',
            border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>

            {/* Olahraga */}
            <div className="courts-sidebar-section" style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(212,175,55,0.12)',
              fontSize: '.7rem', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--primary)',
              background: 'rgba(212,175,55,0.05)',
            }}>
              <span className="courts-sidebar-heading">Jenis Olahraga</span>
            </div>
            <div>
              {SPORT_TYPES.map(sport => {
                const on = sportFilter === sport.value;
                return (
                  <button
                    key={sport.value}
                    className={`courts-sidebar-btn${sportFilter === sport.value ? ' active-item' : ''}`}
                    onClick={() => setSportFilter(sport.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '11px 16px',
                      background: on ? `${sport.color}15` : 'transparent',
                      border: 'none',
                      borderLeft: on ? `3px solid ${sport.color}` : '3px solid transparent',
                      cursor: 'pointer',
                      color: on ? sport.color : 'var(--text-secondary)',
                      fontWeight: on ? 700 : 400,
                      fontSize: '.88rem',
                      textAlign: 'left',
                      transition: 'all .15s',
                      borderBottom: '1px solid rgba(212,175,55,0.06)',
                    }}
                    onMouseEnter={e => {
                      if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!on) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: on ? sport.color : 'rgba(255,255,255,0.15)',
                      flexShrink: 0,
                      transition: 'all .15s',
                      boxShadow: on ? `0 0 8px ${sport.color}88` : 'none',
                    }} />
                    {sport.label}
                  </button>
                );
              })}
            </div>

            {/* Tipe Lapangan */}
            <div className="courts-sidebar-section" style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(212,175,55,0.12)',
              borderTop: '1px solid rgba(212,175,55,0.12)',
              fontSize: '.7rem', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--primary)',
              background: 'rgba(212,175,55,0.05)',
            }}>
              <span className="courts-sidebar-heading">Tipe Lapangan</span>
            </div>
            <div>
              {[
                { v: '',        l: 'Semua',   color: '#D4AF37' },
                { v: 'indoor',  l: 'Indoor',  color: '#3B82F6' },
                { v: 'outdoor', l: 'Outdoor', color: '#22C55E' },
              ].map(opt => {
                const on = typeFilter === opt.v;
                return (
                  <button key={opt.v} className={`courts-sidebar-btn${typeFilter === opt.v ? ' active-item' : ''}`} onClick={() => setTypeFilter(opt.v)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 16px',
                    background: on ? `${opt.color}15` : 'transparent',
                    border: 'none',
                    borderLeft: on ? `3px solid ${opt.color}` : '3px solid transparent',
                    cursor: 'pointer',
                    color: on ? opt.color : 'var(--text-secondary)',
                    fontWeight: on ? 700 : 400,
                    fontSize: '.88rem',
                    textAlign: 'left',
                    transition: 'all .15s',
                    borderBottom: '1px solid rgba(212,175,55,0.06)',
                  }}
                    onMouseEnter={e => {
                      if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!on) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: on ? opt.color : 'rgba(255,255,255,0.15)',
                      flexShrink: 0,
                      boxShadow: on ? `0 0 8px ${opt.color}88` : 'none',
                    }} />
                    {opt.l}
                  </button>
                );
              })}
            </div>

            {/* Reset button */}
            {hasFilter && (
              <div className="courts-sidebar-reset" style={{ padding: '12px 16px', borderTop: '1px solid rgba(212,175,55,0.12)' }}>
                <button
                  onClick={() => { setSportFilter(''); setTypeFilter(''); setSearch(''); }}
                  style={{
                    width: '100%', padding: '8px', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                    color: '#EF4444', fontSize: '.8rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  Reset Filter
                </button>
              </div>
            )}
          </aside>

          {/* ── RIGHT CONTENT ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Active filters + count row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {sportFilter && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  background: `${activeSport.color}18`, border: `1px solid ${activeSport.color}44`,
                  borderRadius: 20, fontSize: '.78rem', fontWeight: 600, color: activeSport.color,
                }}>
                  {activeSport.label}
                  <button onClick={() => setSportFilter('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', padding: 0, fontSize: '.9rem', lineHeight: 1, opacity: .8,
                  }}>×</button>
                </span>
              )}
              {typeFilter && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20, fontSize: '.78rem', color: 'var(--text-secondary)',
                }}>
                  {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                  <button onClick={() => setTypeFilter('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', padding: 0, fontSize: '.9rem', lineHeight: 1,
                  }}>×</button>
                </span>
              )}
              {search && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20, fontSize: '.78rem', color: 'var(--text-secondary)',
                }}>
                  &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', padding: 0, fontSize: '.9rem', lineHeight: 1,
                  }}>×</button>
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                {!loading && (
                  <><strong style={{ color: 'var(--primary)' }}>{courts.length}</strong> lapangan ditemukan</>
                )}
              </span>
            </div>

            {/* ── Courts Grid ── */}
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : courts.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-icon" style={{ fontSize: '3rem', opacity: .4 }}>—</div>
                <h3 style={{ marginTop: 16 }}>Belum ada lapangan tersedia</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {hasFilter ? 'Coba ubah filter atau kata kunci' : 'Lapangan segera hadir!'}
                </p>
                {hasFilter && (
                  <button className="btn btn-primary" style={{ marginTop: 20 }}
                    onClick={() => { setSportFilter(''); setTypeFilter(''); setSearch(''); }}>
                    Tampilkan Semua
                  </button>
                )}
              </div>
            ) : (
              <div className="courts-grid">
                {courts.map(court => {
                  const sport = SPORT_MAP[court.sport_type] || { color: '#D4AF37', label: 'Olahraga' };
                  const isIndoor = court.court_type === 'indoor';
                  return (
                    <Link to={`/courts/${court.id}`} key={court.id} className="card court-card">
                      <div className="card-image" style={{ position: 'relative', overflow: 'hidden' }}>
                        <img
                          src={getCourtImage(court)}
                          alt={court.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease' }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                          onError={e => { e.target.src = `https://placehold.co/800x400/1A1A28/D4AF37?text=${encodeURIComponent(court.name)}`; }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(10,10,18,0.7) 0%, transparent 55%)',
                          pointerEvents: 'none',
                        }} />
                        {/* Sport badge */}
                        <span style={{
                          position: 'absolute', top: 10, left: 10,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 20,
                          background: `${sport.color}cc`,
                          color: '#fff', fontSize: '.7rem', fontWeight: 700,
                          backdropFilter: 'blur(8px)',
                          boxShadow: `0 2px 10px ${sport.color}55`,
                        }}>
                          {sport.label}
                        </span>
                        {/* Indoor/Outdoor badge */}
                        <span style={{
                          position: 'absolute', top: 10, right: 10,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 20,
                          background: isIndoor ? 'rgba(59,130,246,0.85)' : 'rgba(22,163,74,0.85)',
                          color: '#fff', fontSize: '.7rem', fontWeight: 700,
                          backdropFilter: 'blur(8px)',
                        }}>
                          {isIndoor ? 'Indoor' : 'Outdoor'}
                        </span>
                      </div>
                      <div className="card-body">
                        <h3 className="card-title">{court.name}</h3>
                        <div className="court-meta">
                          <span><HiOutlineLocationMarker /> {court.location}</span>
                        </div>
                        <p className="card-text" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {court.description}
                        </p>
                        <div className="court-price">{fmt(court.price_per_hour)} <small>/ jam</small></div>
                        <button className="btn btn-primary btn-block">Lihat Detail &amp; Booking</button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
