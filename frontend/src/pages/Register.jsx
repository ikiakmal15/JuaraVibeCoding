import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineMail, HiOutlineLockClosed, HiOutlineUser,
  HiOutlinePhone, HiOutlineEye, HiOutlineEyeOff,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    role: 'user'
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8)        errors.push('Minimal 8 karakter');
    if (!/[A-Z]/.test(pwd))   errors.push('Wajib ada huruf kapital');
    if (!/[0-9]/.test(pwd))   errors.push('Wajib ada angka');
    if (/\s/.test(pwd))       errors.push('Tidak boleh mengandung spasi');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const pwdErrors = validatePassword(form.password);
    if (pwdErrors.length > 0) { setError(pwdErrors[0]); return; }
    if (form.password !== form.confirmPassword) { setError('Password tidak cocok.'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone, form.role);
      toast.success(`Registrasi berhasil sebagai ${form.role === 'admin' ? 'Admin' : 'User'}! 🎉`);
      navigate(form.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registrasi gagal.');
    } finally { setLoading(false); }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius)',
            background: form.role === 'admin' ? 'var(--primary)' : 'var(--secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '1.5rem',
            border: '3px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            transition: 'background 0.3s'
          }}>
            {form.role === 'admin' ? '🛡️' : '🎾'}
          </div>
        </div>
        <h1>Daftar</h1>
        <p className="subtitle">Buat akun dan mulai booking lapangan</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>

          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label">
              <HiOutlineShieldCheck style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Daftar Sebagai
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => update('role', 'user')}
                style={{
                  padding: '12px 16px', borderRadius: 'var(--radius)',
                  border: `2px solid ${form.role === 'user' ? 'var(--secondary)' : 'rgba(212,175,55,0.2)'}`,
                  background: form.role === 'user' ? 'rgba(28,181,181,0.15)' : 'rgba(255,255,255,0.04)',
                  fontWeight: 700, fontSize: '.9rem', cursor: 'pointer',
                  transition: 'all .2s', color: form.role === 'user' ? 'var(--secondary)' : 'var(--text-secondary)'
                }}
              >
                🎾 User Biasa
              </button>
              <button
                type="button"
                onClick={() => update('role', 'admin')}
                style={{
                  padding: '12px 16px', borderRadius: 'var(--radius)',
                  border: `2px solid ${form.role === 'admin' ? 'var(--primary)' : 'rgba(212,175,55,0.2)'}`,
                  background: form.role === 'admin' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                  fontWeight: 700, fontSize: '.9rem', cursor: 'pointer',
                  transition: 'all .2s', color: form.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label"><HiOutlineUser style={{ verticalAlign: 'middle', marginRight: 4 }} /> Nama Lengkap</label>
            <input className="form-input" placeholder="John Doe" value={form.name} onChange={e => update('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label"><HiOutlineMail style={{ verticalAlign: 'middle', marginRight: 4 }} /> Email</label>
            <input type="email" className="form-input" placeholder="nama@email.com" value={form.email} onChange={e => update('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label"><HiOutlinePhone style={{ verticalAlign: 'middle', marginRight: 4 }} /> No. Telepon</label>
            <input className="form-input" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => update('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><HiOutlineLockClosed style={{ verticalAlign: 'middle', marginRight: 4 }} /> Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Min. 8 karakter, huruf kapital & angka"
                value={form.password}
                onChange={e => update('password', e.target.value.replace(/\s/g, ''))}
                required
                style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: '#555', fontSize: '1.2rem' }}>
                {showPass ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
            {/* Real-time password rules indicator */}
            {form.password.length > 0 && (() => {
              const rules = [
                { label: 'Minimal 8 karakter',        ok: form.password.length >= 8 },
                { label: 'Ada huruf kapital (A-Z)',    ok: /[A-Z]/.test(form.password) },
                { label: 'Ada angka (0-9)',            ok: /[0-9]/.test(form.password) },
                { label: 'Tidak ada spasi',            ok: !/\s/.test(form.password) },
              ];
              return (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {rules.map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: r.ok ? '#4ade80' : '#f87171' }}>
                      <span style={{ fontSize: '.7rem' }}>{r.ok ? '✓' : '✗'}</span>
                      {r.label}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="form-group">
            <label className="form-label"><HiOutlineLockClosed style={{ verticalAlign: 'middle', marginRight: 4 }} /> Konfirmasi Password</label>
            <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="Ulangi password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
          </div>


          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Memproses...' : `Daftar Sebagai ${form.role === 'admin' ? 'Admin' : 'User'}`}
          </button>
        </form>
        <div className="auth-footer">Sudah punya akun? <Link to="/login">Masuk</Link></div>
      </div>
    </div>
  );
}
