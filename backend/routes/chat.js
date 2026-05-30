const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Rule-Based Bot ────────────────────────────────────────────────
const botRules = [
  { match: (t) => /^(halo|hai|hi|hey|hei|selamat|pagi|siang|sore|malam|alo|permisi)/.test(t) || t === 'halo' || t === 'hi',
    answer: 'Halo! Selamat datang di SportSpace!\n\nSaya adalah asisten AI yang siap membantu Anda. Silakan tanyakan tentang booking, harga, fasilitas, atau informasi lainnya!' },
  { match: (t) => t.includes('jam buka') || t.includes('operasional') || (t.includes('jam') && (t.includes('buka') || t.includes('sampai') || t.includes('tutup'))),
    answer: 'Jam Operasional SportSpace:\n\nSetiap hari: 06.00 - 22.00 WIB\n\nBuka 7 hari seminggu termasuk hari libur. Booking minimal 1 jam.' },
  { match: (t) => t.includes('booking') || t.includes('pesan') || t.includes('cara') || t.includes('gimana') || t.includes('bagaimana'),
    answer: 'Cara booking di SportSpace:\n\n1. Pilih menu Lapangan di navbar\n2. Pilih lapangan yang diinginkan\n3. Klik "Lihat Detail & Booking"\n4. Isi tanggal, jam mulai & selesai\n5. Konfirmasi dan lakukan pembayaran\n\nAdmin akan mengkonfirmasi booking Anda.' },
  { match: (t) => t.includes('bayar') || t.includes('payment') || t.includes('metode') || t.includes('transfer') || t.includes('qris') || t.includes('cod'),
    answer: 'Metode pembayaran yang tersedia:\n\n- QRIS (semua e-wallet)\n- Bank Transfer (BCA, Mandiri, BRI, BNI)\n- COD (bayar di tempat)\n- Kartu Debit\n\nPembayaran dilakukan setelah booking dikonfirmasi admin.' },
  { match: (t) => t.includes('harga') || t.includes('tarif') || t.includes('biaya') || (t.includes('berapa') && !t.includes('jam')),
    answer: 'Harga sewa lapangan di SportSpace:\n\n- Indoor: mulai Rp 75.000/jam\n- Outdoor: mulai Rp 60.000/jam\n\nHarga bervariasi tergantung jenis lapangan dan waktu.' },
  { match: (t) => t.includes('fasilitas') || t.includes('parkir') || t.includes('toilet') || t.includes('loker') || t.includes('wifi'),
    answer: 'Fasilitas di SportSpace:\n\n- Area parkir luas & gratis\n- Toilet & shower bersih\n- Loker penyimpanan\n- WiFi gratis\n- Kantin & minuman\n- Penyewaan peralatan olahraga' },
  { match: (t) => t.includes('lokasi') || t.includes('alamat') || t.includes('dimana') || t.includes('tempat'),
    answer: 'Kami memiliki lapangan di berbagai lokasi strategis. Cek detail alamat di halaman Lapangan untuk informasi lengkap.' },
  { match: (t) => t.includes('cancel') || t.includes('batal') || t.includes('refund') || t.includes('reschedule'),
    answer: 'Kebijakan Pembatalan:\n\n- Batal lebih dari 24 jam sebelum: refund 100%\n- Batal kurang dari 24 jam: refund 50%\n- No-show: tidak ada refund\n\nHubungi admin untuk proses lebih lanjut.' },
  { match: (t) => t.includes('promo') || t.includes('diskon') || t.includes('voucher') || t.includes('murah'),
    answer: 'Promo SportSpace:\n\n- Early Bird: diskon 10% untuk booking sebelum jam 09.00\n- Off-Peak: harga spesial jam 14.00-17.00 hari kerja\n- Group: diskon untuk booking 3+ lapangan\n\nTanya admin untuk info promo terkini!' },
  { match: (t) => t.includes('terima kasih') || t.includes('makasih') || t.includes('thanks') || t === 'ok' || t === 'oke',
    answer: 'Sama-sama! Senang bisa membantu. Jangan ragu untuk bertanya kapan saja.' },
];

function getRuleBotResponse(message) {
  const lower = message.toLowerCase().trim();
  for (const rule of botRules) {
    try { if (rule.match(lower)) return rule.answer; } catch (e) {}
  }
  return 'Terima kasih sudah menghubungi SportSpace!\n\nAdmin kami akan segera membalas pesan Anda.\n\nJam admin aktif: 08.00 - 20.00 WIB';
}

let aiModel = null;
(async () => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') return;
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Gemini AI aktif!');
  } catch (err) { /* fallback ke rule-based */ }
})();

async function generateBotResponse(userMessage) {
  if (aiModel) {
    try {
      const prompt = `Kamu CS SportSpace (platform booking lapangan olahraga). Jawab dalam Bahasa Indonesia, ramah, tanpa emoji, max 4 kalimat.\nInfo: indoor Rp75rb/jam, outdoor Rp60rb/jam, buka 06-22 WIB, bayar via QRIS/transfer/COD/debit.\nPertanyaan: ${userMessage}`;
      const result = await aiModel.generateContent(prompt);
      return result.response.text();
    } catch (err) { /* fallback */ }
  }
  return getRuleBotResponse(userMessage);
}

// ── GET /messages ─────────────────────────────────────────────────
router.get('/messages', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let messages;

    if (req.user.role === 'admin') {
      const userId = req.query.user_id;
      if (userId) {
        messages = db.prepare(`
          SELECT cm.*, u.name as sender_name, u.role as sender_role
          FROM chat_messages cm
          JOIN users u ON cm.sender_id = u.id
          WHERE (cm.sender_id = ? OR cm.receiver_id = ?)
          ORDER BY cm.created_at ASC
        `).all(userId, userId);
        db.prepare(`UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id IS NOT NULL`).run(userId);
      } else {
        messages = db.prepare(`
          SELECT DISTINCT u.id, u.name, u.email,
            (SELECT message FROM chat_messages WHERE (sender_id = u.id OR receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM chat_messages WHERE (sender_id = u.id OR receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message_time,
            (SELECT COUNT(*) FROM chat_messages WHERE sender_id = u.id AND is_read = 0) as unread_count
          FROM users u
          WHERE u.id IN (
            SELECT sender_id FROM chat_messages WHERE sender_id != ?
            UNION
            SELECT COALESCE(receiver_id, 0) FROM chat_messages WHERE sender_id = ? AND receiver_id IS NOT NULL
          )
          ORDER BY last_message_time DESC
        `).all(req.user.id, req.user.id);
      }
    } else {
      messages = db.prepare(`
        SELECT cm.*, u.name as sender_name, u.role as sender_role
        FROM chat_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE cm.sender_id = ?
          OR (cm.receiver_id = ?)
          OR (cm.sender_id IN (SELECT id FROM users WHERE role = 'admin') AND cm.receiver_id = ?)
        ORDER BY cm.created_at ASC
      `).all(req.user.id, req.user.id, req.user.id);

      db.prepare(`
        UPDATE chat_messages SET is_read = 1
        WHERE receiver_id = ? AND sender_id IN (SELECT id FROM users WHERE role = 'admin')
      `).run(req.user.id);
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// ── POST /send ────────────────────────────────────────────────────
router.post('/send', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { message, receiver_id } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    let actualReceiverId = receiver_id || null;
    if (req.user.role !== 'admin') {
      const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      actualReceiverId = admin ? admin.id : null;
    }

    const result = db.prepare(
      'INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)'
    ).run(req.user.id, actualReceiverId, message.trim());

    const chatMsg = db.prepare(`
      SELECT cm.*, u.name as sender_name, u.role as sender_role
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(chatMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// ── POST /bot-send ────────────────────────────────────────────────
router.post('/bot-send', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const { message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    }

    const trimmedMessage = message.trim();
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    const adminId = admin ? admin.id : null;

    // Cek apakah ini pesan PERTAMA dari user
    const prevCount = db.prepare('SELECT COUNT(*) as cnt FROM chat_messages WHERE sender_id = ?').get(userId);
    const isFirstMessage = prevCount.cnt === 0;

    // Simpan pesan user
    const userMsgResult = db.prepare(
      'INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)'
    ).run(userId, adminId, trimmedMessage);

    const userMsg = db.prepare(`
      SELECT cm.*, u.name as sender_name, u.role as sender_role
      FROM chat_messages cm JOIN users u ON cm.sender_id = u.id
      WHERE cm.id = ?
    `).get(userMsgResult.lastInsertRowid);

    const result = { userMsg, botMsg: null };

    // Bot hanya balas pada PESAN PERTAMA
    if (userRole !== 'admin' && adminId && isFirstMessage) {
      try {
        const botReply = await generateBotResponse(trimmedMessage);
        const botMsgResult = db.prepare(
          'INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)'
        ).run(adminId, userId, `[BOT] ${botReply}`);

        result.botMsg = db.prepare(`
          SELECT cm.*, u.name as sender_name, u.role as sender_role
          FROM chat_messages cm JOIN users u ON cm.sender_id = u.id
          WHERE cm.id = ?
        `).get(botMsgResult.lastInsertRowid);
      } catch (botErr) {
        console.error('Bot reply error:', botErr);
      }
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('bot-send error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ── GET /unread ───────────────────────────────────────────────────
router.get('/unread', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let count;
    if (req.user.role === 'admin') {
      count = db.prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE is_read = 0 AND sender_id NOT IN (SELECT id FROM users WHERE role = 'admin')`).get();
    } else {
      count = db.prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND is_read = 0 AND sender_id IN (SELECT id FROM users WHERE role = 'admin')`).get(req.user.id);
    }
    res.json({ unread: count.count });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// ── DELETE /clear ─────────────────────────────────────────────────
router.delete('/clear', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    db.prepare('DELETE FROM chat_messages WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
    res.json({ message: 'Chat berhasil dihapus' });
  } catch (err) {
    console.error('clear chat error:', err);
    res.status(500).json({ error: 'Gagal menghapus chat' });
  }
});

module.exports = router;
