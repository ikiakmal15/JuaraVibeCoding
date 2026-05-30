import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineShieldCheck, HiOutlineClock } from 'react-icons/hi';
import HeroCarousel from '../components/HeroCarousel';

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.15 }
    );
    const items = el.querySelectorAll('.reveal-item');
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Home() {
  const featuresRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Features Section */}
      <section className="features" ref={featuresRef}>
        <div className="container">
          <h2 className="section-title reveal-item">Kenapa Memilih <span style={{color:'var(--primary)'}}>SportSpace</span>?</h2>
          <p className="section-subtitle reveal-item">Platform terpercaya untuk booking lapangan olahraga di Indonesia</p>
          <div className="features-grid">
            <div className="feature-card reveal-item">
              <div className="feature-icon"><HiOutlineCalendar /></div>
              <h3>Booking Online</h3>
              <p>Pesan lapangan kapan saja dan di mana saja melalui website kami yang mudah digunakan.</p>
            </div>
            <div className="feature-card reveal-item">
              <div className="feature-icon"><HiOutlineLocationMarker /></div>
              <h3>Berbagai Lokasi</h3>
              <p>Pilihan lapangan olahraga tersebar di berbagai kota besar di seluruh Indonesia.</p>
            </div>
            <div className="feature-card reveal-item">
              <div className="feature-icon"><HiOutlineShieldCheck /></div>
              <h3>Terjamin Kualitas</h3>
              <p>Semua lapangan telah diverifikasi dan memenuhi standar kualitas terbaik.</p>
            </div>
            <div className="feature-card reveal-item">
              <div className="feature-icon"><HiOutlineClock /></div>
              <h3>Jadwal Fleksibel</h3>
              <p>Pilih jadwal bermain sesuai keinginanmu dengan slot waktu yang fleksibel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 0', textAlign: 'center' }} ref={ctaRef}>
        <div className="container">
          <div className="cta-card reveal-item" style={{
            background: 'linear-gradient(135deg, #1A1A28 0%, #12121A 100%)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '20px', padding: '60px 40px',
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(212,175,55,0.1), transparent 50%), radial-gradient(circle at 80% 50%, rgba(28,181,181,0.08), transparent 50%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
          }}>
            <h2 className="section-title" style={{ color: '#F0EDE8', fontWeight: 800 }}>Siap Berolahraga? 🏆</h2>
            <p className="section-subtitle" style={{ marginBottom: '32px', color: '#9B97A0' }}>Daftar sekarang dan nikmati kemudahan booking lapangan olahraga favoritmu!</p>
            <Link to="/courts" className="btn btn-primary btn-lg">Mulai Booking</Link>
          </div>
        </div>
      </section>
    </>
  );
}
