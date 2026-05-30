import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMail, HiOutlinePhone, HiOutlineUser, HiOutlineShieldCheck } from 'react-icons/hi';
import api from '../api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/me', form);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.reload();
      toast.success('Profil berhasil diperbarui!');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '2rem', color: '#fff', fontWeight: 700
          }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <h1 style={{ marginBottom: '4px' }}>{user.name}</h1>
          <span className={`badge ${user.role === 'admin' ? 'badge-confirmed' : 'badge-completed'}`}>
            <HiOutlineShieldCheck style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {user.role === 'admin' ? 'Administrator' : 'Member'}
          </span>
        </div>

        {!editing ? (
          <div>
            <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HiOutlineMail style={{ fontSize: '1.2rem', color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</div>
                  <div style={{ fontWeight: 600 }}>{user.email}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HiOutlineUser style={{ fontSize: '1.2rem', color: 'var(--secondary)' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nama</div>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HiOutlinePhone style={{ fontSize: '1.2rem', color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Telepon</div>
                  <div style={{ fontWeight: 600 }}>{user.phone || '-'}</div>
                </div>
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => setEditing(true)}>Edit Profil</button>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nama</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
