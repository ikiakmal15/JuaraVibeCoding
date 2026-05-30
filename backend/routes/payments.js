const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Create payment for a booking
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { booking_id, payment_method, bank_name, account_number, card_last_four } = req.body;

    if (!booking_id || !payment_method) {
      return res.status(400).json({ error: 'Booking ID dan metode pembayaran wajib diisi.' });
    }

    const validMethods = ['cod', 'qris', 'bank_transfer', 'debit'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
    }

    // Check booking exists and belongs to user
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(booking_id, req.user.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    }

    // Check if payment already exists
    const existingPayment = db.prepare("SELECT id FROM payments WHERE booking_id = ? AND payment_status != 'failed'").get(booking_id);
    if (existingPayment) {
      return res.status(400).json({ error: 'Pembayaran untuk booking ini sudah ada.' });
    }

    // Generate transaction reference
    const txRef = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // For COD, payment is pending until delivery; for others, simulate instant success
    let paymentStatus = 'pending';
    let paidAt = null;
    
    if (payment_method === 'qris' || payment_method === 'bank_transfer' || payment_method === 'debit') {
      paymentStatus = 'paid';
      paidAt = new Date().toISOString();
    }

    const result = db.prepare(`
      INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, bank_name, account_number, card_last_four, transaction_ref, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      booking_id, req.user.id, booking.total_price, payment_method, paymentStatus,
      bank_name || null, account_number || null, card_last_four || null, txRef, paidAt
    );

    // Update booking status to confirmed if paid
    if (paymentStatus === 'paid') {
      db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(booking_id);
    }

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Pembayaran berhasil diproses!', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Get payment by booking ID
router.get('/booking/:bookingId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const payment = db.prepare(`
      SELECT p.*, b.court_id, b.booking_date, b.start_time, b.end_time, c.name as court_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN courts c ON b.court_id = c.id
      WHERE p.booking_id = ? AND (p.user_id = ? OR ? = 'admin')
    `).get(req.params.bookingId, req.user.id, req.user.role);
    
    if (!payment) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan.' });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Get user's payments
router.get('/my', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare(`
      SELECT p.*, b.booking_date, b.start_time, b.end_time, c.name as court_name, c.location as court_location
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN courts c ON b.court_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Admin: Get all payments
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare(`
      SELECT p.*, b.booking_date, b.start_time, b.end_time, c.name as court_name, u.name as user_name, u.email as user_email
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN courts c ON b.court_id = c.id
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Admin: Update payment status (for COD confirmation)
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { payment_status } = req.body;
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ error: 'Status pembayaran tidak valid.' });
    }

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan.' });
    }

    const paidAt = payment_status === 'paid' ? new Date().toISOString() : payment.paid_at;
    db.prepare('UPDATE payments SET payment_status = ?, paid_at = ? WHERE id = ?').run(payment_status, paidAt, req.params.id);

    // Update booking status based on payment
    if (payment_status === 'paid') {
      db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(payment.booking_id);
    } else if (payment_status === 'refunded' || payment_status === 'failed') {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(payment.booking_id);
    }

    res.json({ message: `Status pembayaran berhasil diubah menjadi ${payment_status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
