const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// IMPORTANT: Place admin and static routes BEFORE parameterized routes

// Admin: Get dashboard stats
router.get('/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const totalCourts = db.prepare('SELECT COUNT(*) as count FROM courts WHERE is_active = 1').get().count;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    const pendingBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").get().count;
    const confirmedBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status IN ('confirmed', 'completed')").get().total;

    const recentBookings = db.prepare(`
      SELECT b.*, c.name as court_name, u.name as user_name
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      totalCourts,
      totalUsers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      totalRevenue,
      recentBookings
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Admin: Get all bookings
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const bookings = db.prepare(`
      SELECT b.*, c.name as court_name, c.location as court_location, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `).all();

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Get user's bookings
router.get('/my', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const bookings = db.prepare(`
      SELECT b.*, c.name as court_name, c.location as court_location, c.image_url as court_image, c.court_type
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
    `).all(req.user.id);

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Get booked slots for a court on a specific date
router.get('/slots/:courtId/:date', (req, res) => {
  try {
    const db = getDb();
    const { courtId, date } = req.params;
    const bookedSlots = db.prepare(`
      SELECT start_time, end_time FROM bookings 
      WHERE court_id = ? AND booking_date = ? AND status != 'cancelled'
    `).all(courtId, date);

    res.json(bookedSlots);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Create booking
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { court_id, booking_date, start_time, end_time, notes } = req.body;

    if (!court_id || !booking_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Lapangan, tanggal, waktu mulai, dan waktu selesai wajib diisi.' });
    }

    // Check court exists
    const court = db.prepare('SELECT * FROM courts WHERE id = ? AND is_active = 1').get(court_id);
    if (!court) {
      return res.status(404).json({ error: 'Lapangan tidak ditemukan atau tidak aktif.' });
    }

    // Check for booking conflict
    const conflict = db.prepare(`
      SELECT id FROM bookings 
      WHERE court_id = ? AND booking_date = ? AND status != 'cancelled'
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `).get(court_id, booking_date, end_time, start_time, end_time, start_time, start_time, end_time);

    if (conflict) {
      return res.status(400).json({ error: 'Jadwal sudah terisi. Silakan pilih waktu lain.' });
    }

    // Calculate duration and price
    const startParts = start_time.split(':').map(Number);
    const endParts = end_time.split(':').map(Number);
    const durationHours = (endParts[0] + endParts[1] / 60) - (startParts[0] + startParts[1] / 60);

    if (durationHours <= 0) {
      return res.status(400).json({ error: 'Waktu selesai harus lebih besar dari waktu mulai.' });
    }

    const totalPrice = durationHours * court.price_per_hour;

    const result = db.prepare(`
      INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, duration_hours, total_price, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, court_id, booking_date, start_time, end_time, durationHours, totalPrice, notes || null);

    const booking = db.prepare(`
      SELECT b.*, c.name as court_name, c.location as court_location, u.name as user_name
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Booking berhasil dibuat!', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Cancel booking
router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    }

    // Only owner or admin can cancel
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Anda tidak memiliki akses.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking sudah dibatalkan.' });
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Booking berhasil dibatalkan.' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Admin: Update booking status
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: `Status booking berhasil diubah menjadi ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
