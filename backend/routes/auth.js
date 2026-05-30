const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database belum siap.' });
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const phone = (req.body.phone || '').trim() || null;
    const role = req.body.role;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password wajib mengandung huruf kapital.' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password wajib mengandung angka.' });
    }
    if (/\s/.test(password)) {
      return res.status(400).json({ error: 'Password tidak boleh mengandung spasi.' });
    }

    const requestedRole = role === 'admin' ? 'admin' : 'user';

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, hashedPassword, phone, requestedRole);

    const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE LOWER(email) = ?').get(email);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'padel_court_super_secret_key_2024',
      { expiresIn: '24h' }
    );

    res.status(201).json({ message: 'Registrasi berhasil!', user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server: ' + err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database belum siap.' });
    // Trim whitespace dan lowercase email
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    // Case-insensitive email lookup
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user) {
      console.log(`[Login] Email tidak ditemukan: ${email}`);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    // Pastikan hash adalah string (sql.js bisa return tipe berbeda)
    const storedHash = String(user.password);
    const isValidPassword = bcrypt.compareSync(password, storedHash);
    if (!isValidPassword) {
      console.log(`[Login] Password salah untuk: ${email}`);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'padel_court_super_secret_key_2024',
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login berhasil!', user: userWithoutPassword, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server: ' + err.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, phone, role, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Update profile
router.put('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, phone } = req.body;
    db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
      .run(name, phone, req.user.id);
    const user = db.prepare('SELECT id, name, email, phone, role, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ message: 'Profil berhasil diperbarui.', user });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
