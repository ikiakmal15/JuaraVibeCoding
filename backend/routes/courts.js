const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Multer config for court images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'courts');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `court-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan (jpg/png/webp/gif)'));
  }
});

// IMPORTANT: Place /admin/all BEFORE /:id to avoid route conflict
// Get all courts including inactive (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const courts = db.prepare('SELECT * FROM courts ORDER BY created_at DESC').all();
    res.json(courts);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Get all courts (public)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { type, location, search, sport_type } = req.query;
    let query = 'SELECT * FROM courts WHERE is_active = 1';
    const params = [];

    if (type) {
      query += ' AND court_type = ?';
      params.push(type);
    }
    if (sport_type) {
      query += ' AND sport_type = ?';
      params.push(sport_type);
    }
    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const courts = db.prepare(query).all(...params);
    res.json(courts);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Get single court (public)
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const court = db.prepare('SELECT * FROM courts WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!court) {
      return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
    }
    res.json(court);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Create court (admin only) — JSON body, no file
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, description, location, price_per_hour, image_url, court_type, sport_type, facilities } = req.body;

    if (!name || !location || !price_per_hour) {
      return res.status(400).json({ error: 'Nama, lokasi, dan harga per jam wajib diisi.' });
    }

    const result = db.prepare(`
      INSERT INTO courts (name, description, location, price_per_hour, image_url, court_type, sport_type, facilities) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, location, price_per_hour, image_url || '/images/default-court.jpg', court_type || 'indoor', sport_type || 'futsal', facilities);

    const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Lapangan berhasil ditambahkan.', court });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Create court WITH image upload (admin only) — multipart/form-data
router.post('/with-image', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const { name, description, location, price_per_hour, court_type, sport_type, facilities, image_url } = req.body;

    if (!name || !location || !price_per_hour) {
      return res.status(400).json({ error: 'Nama, lokasi, dan harga per jam wajib diisi.' });
    }

    let finalImageUrl = image_url || '/images/default-court.jpg';
    if (req.file) {
      finalImageUrl = `/uploads/courts/${req.file.filename}`;
    }

    const result = db.prepare(`
      INSERT INTO courts (name, description, location, price_per_hour, image_url, court_type, sport_type, facilities) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, location, price_per_hour, finalImageUrl, court_type || 'indoor', sport_type || 'futsal', facilities);

    const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Lapangan berhasil ditambahkan.', court });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server: ' + err.message });
  }
});

// Update court (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, description, location, price_per_hour, image_url, court_type, sport_type, facilities, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
    }

    db.prepare(`
      UPDATE courts SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        location = COALESCE(?, location),
        price_per_hour = COALESCE(?, price_per_hour),
        image_url = COALESCE(?, image_url),
        court_type = COALESCE(?, court_type),
        sport_type = COALESCE(?, sport_type),
        facilities = COALESCE(?, facilities),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, location, price_per_hour, image_url, court_type, sport_type, facilities, is_active, req.params.id);

    const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
    res.json({ message: 'Lapangan berhasil diperbarui.', court });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Delete court (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
    }

    db.prepare('DELETE FROM courts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Lapangan berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Upload court image (admin only) — multipart/form-data with field "image"
router.post('/:id/upload-image', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file gambar yang diupload.' });
    }

    // Delete old uploaded image if it exists (not external URLs)
    if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', existing.image_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const imageUrl = `/uploads/courts/${req.file.filename}`;
    db.prepare('UPDATE courts SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(imageUrl, req.params.id);

    const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
    res.json({ message: 'Gambar berhasil diupload.', image_url: imageUrl, court });
  } catch (err) {
    res.status(500).json({ error: 'Gagal upload gambar: ' + err.message });
  }
});



module.exports = router;
