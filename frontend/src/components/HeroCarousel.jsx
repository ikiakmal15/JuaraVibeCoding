import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    title: 'Booking Lapangan',
    highlight: 'Olahraga',
    subtitle: 'Jadi Lebih Mudah',
    desc: 'Temukan dan sewa lapangan futsal, badminton, tenis, basket, padel & lainnya di kotamu. Proses cepat, harga transparan, pengalaman terbaik.',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80',
    color: '#FF6B35',
  },
  {
    title: 'Lapangan',
    highlight: 'Premium',
    subtitle: 'Semua Cabang Olahraga',
    desc: 'Semua lapangan telah diverifikasi dan memenuhi standar internasional. Nikmati fasilitas lengkap untuk permainan terbaikmu.',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&q=80',
    color: '#1CB5B5',
  },
  {
    title: 'Bermain',
    highlight: 'Bersama',
    subtitle: 'Kapan Saja & Di Mana Saja',
    desc: 'Jadwal fleksibel, booking mudah. Ajak teman dan keluarga berolahraga di lokasi terdekat dari rumahmu.',
    image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=1200&q=80',
    color: '#FFB800',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [current, goTo]);

  const slide = slides[current];

  return (
    <div className="hero-carousel">
      {/* Background images */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`hero-carousel-bg ${i === current ? 'active' : ''}`}
          style={{ backgroundImage: `url(${s.image})` }}
        />
      ))}
      <div className="hero-carousel-overlay" />

      {/* Content */}
      <div className="hero-carousel-content" key={current}>
        <h1 className="hero-carousel-title animate-slide-up">
          {slide.title} <span style={{ background: 'linear-gradient(135deg,#D4AF37,#F5E642)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{slide.highlight}</span>
          <br />{slide.subtitle}
        </h1>
        <p className="hero-carousel-desc animate-slide-up delay-1">{slide.desc}</p>
        <div className="hero-carousel-actions animate-slide-up delay-2">
          <Link to="/courts" className="btn btn-primary btn-lg">Lihat Lapangan</Link>
          <Link to="/register" className="btn btn-secondary btn-lg">Daftar Sekarang</Link>
        </div>
      </div>

      {/* Dots */}
      <div className="hero-carousel-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="hero-carousel-progress">
        <div className="hero-progress-bar" key={current} style={{ background: slide.color }} />
      </div>
    </div>
  );
}
