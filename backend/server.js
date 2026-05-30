// SportSpace Backend Server v6 - Fixed Bot + Stable API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');

const { initializeDatabase, getDb } = require('./database');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

fs.mkdirSync(path.join(__dirname, 'uploads', 'courts'), { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SportSpace API running', ts: Date.now() });
});

// Debug: list semua user (hapus setelah testing)
app.get('/api/debug/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, name, email, role, created_at FROM users').all();
    res.json({ total: users.length, users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Debug: test login langsung
app.post('/api/debug/test-login', (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const db = getDb();
    const { email, password } = req.body;
    const emailLower = (email || '').trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(emailLower);
    if (!user) return res.json({ ok: false, reason: 'Email tidak ada di database' });
    const hashType = typeof user.password;
    const hashPreview = String(user.password).substring(0, 20);
    const match = bcrypt.compareSync((password || '').trim(), String(user.password));
    res.json({ ok: match, email: user.email, role: user.role, hashType, hashPreview, match });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── IMPROVED Rule-Based Bot ───────────────────────────────────────
// Rules are checked IN ORDER - put more SPECIFIC rules FIRST
const botRules = [
  // Greetings - most common first
  {
    match: (t) => /^(halo|hai|hi|hey|hei|selamat|pagi|siang|sore|malam|alo|assalamu|permisi)/.test(t) || t === 'halo' || t === 'hi',
    answer: '👋 Halo! Selamat datang di SportSpace!\n\nSaya adalah asisten AI yang siap membantu Anda 24/7. Silakan tanyakan apa saja tentang booking, harga, fasilitas, atau informasi lainnya! 😊'
  },
  // Jam operasional - SPECIFIC (must be before "harga" to avoid "berapa" conflict)
  {
    match: (t) => t.includes('jam buka') || t.includes('jam tutup') || t.includes('jam operasional') || t.includes('operasional') || (t.includes('jam') && (t.includes('buka') || t.includes('sampai') || t.includes('hingga') || t.includes('tutup') || t.includes('open') || t.includes('close'))),
    answer: '🕐 Jam Operasional SportSpace:\n\n⏰ Setiap hari: 06.00 - 22.00 WIB\n\nLapangan buka 7 hari seminggu termasuk hari libur nasional. Booking minimal 1 jam. Disarankan booking 1-2 hari sebelumnya agar tidak kehabisan slot! 🏆'
  },
  // Cara booking
  {
    match: (t) => t.includes('booking') || t.includes('book ') || t.includes('pesan') || t.includes('cara') || t.includes('gimana') || t.includes('bagaimana'),
    answer: '📅 Cara booking di SportSpace sangat mudah!\n\n1️⃣ Pilih menu Lapangan di navbar\n2️⃣ Pilih lapangan yang Anda inginkan\n3️⃣ Klik "Book Sekarang"\n4️⃣ Isi tanggal, jam mulai & jam selesai\n5️⃣ Konfirmasi booking\n6️⃣ Lakukan pembayaran\n\nSelesai! Admin akan mengkonfirmasi booking Anda. ✅'
  },
  // Pembayaran & metode
  {
    match: (t) => t.includes('bayar') || t.includes('payment') || t.includes('metode') || t.includes('transfer') || t.includes('qris') || t.includes('cod') || t.includes('debit') || t.includes('tunai') || t.includes('cash'),
    answer: '💳 Metode pembayaran yang tersedia:\n\n📱 QRIS - Scan & bayar langsung (semua e-wallet)\n🏦 Bank Transfer - BCA, Mandiri, BRI, BNI\n💵 COD - Bayar di tempat saat main\n💳 Kartu Debit - Visa/Mastercard\n\nPembayaran dilakukan setelah booking dikonfirmasi admin. Aman & terpercaya! 🔒'
  },
  // Harga - dengan keyword "berapa" hanya untuk harga, bukan jam
  {
    match: (t) => t.includes('harga') || t.includes('tarif') || t.includes('biaya') || t.includes('price') || t.includes('bayar berapa') || t.includes('harga berapa') || t.includes('tarif berapa') || t.includes('biaya berapa') || (t.includes('berapa') && !t.includes('jam') && !t.includes('hari') && !t.includes('waktu')),
    answer: '💰 Harga sewa lapangan di SportSpace:\n\n🏢 Indoor: mulai Rp 75.000/jam\n🌳 Outdoor: mulai Rp 60.000/jam\n\nTersedia lapangan futsal, badminton, tenis, basket, padel & lainnya. Harga bervariasi tergantung jenis lapangan dan jam peak/off-peak. Cek detail di halaman Lapangan! 🏆'
  },
  // Lapangan kosong / ketersediaan
  {
    match: (t) => t.includes('kosong') || t.includes('tersedia') || t.includes('available') || t.includes('slot') || t.includes('cek jadwal') || (t.includes('lapangan') && (t.includes('ada') || t.includes('lihat') || t.includes('nanya'))),
    answer: '🏸 Untuk cek ketersediaan lapangan:\n\n1️⃣ Buka menu Lapangan\n2️⃣ Pilih lapangan yang diinginkan\n3️⃣ Coba pilih tanggal & jam\n4️⃣ Jika bisa dipilih = masih tersedia ✅\n\nAtau tanyakan ke admin untuk bantuan cek jadwal secara langsung! 📅'
  },
  // Jenis lapangan
  {
    match: (t) => t.includes('indoor') || t.includes('outdoor') || t.includes('jenis lapangan') || (t.includes('lapangan') && t.includes('jenis')),
    answer: '🏆 Jenis lapangan di SportSpace:\n\n⚽ Futsal - Lapangan indoor/outdoor mini soccer\n🏸 Badminton - Lapangan standar BWF\n🎾 Tenis - Lapangan hard/clay court\n🏀 Basket - Half court & full court\n🏓 Padel - Lapangan padel premium\n\nDilengkapi pencahayaan optimal dan fasilitas lengkap! 💡'
  },
  // Fasilitas
  {
    match: (t) => t.includes('fasilitas') || t.includes('parkir') || t.includes('toilet') || t.includes('loker') || t.includes('shower') || t.includes('wifi') || t.includes('kantin'),
    answer: '🏟️ Fasilitas di SportSpace:\n\n✅ Area parkir luas & gratis\n✅ Toilet & shower bersih\n✅ Loker penyimpanan barang\n✅ WiFi gratis\n✅ Kantin & minuman\n✅ Penyewaan peralatan olahraga\n✅ Tribun penonton\n\nFasilitas lengkap untuk kenyamanan Anda! 🌟'
  },
  // Lokasi
  {
    match: (t) => t.includes('lokasi') || t.includes('alamat') || t.includes('dimana') || t.includes('where') || t.includes('tempat') || t.includes('maps') || t.includes('peta'),
    answer: '📍 Lokasi SportSpace:\n\nKami memiliki lapangan di berbagai lokasi strategis di kota Anda!\n\nCek detail alamat masing-masing lapangan di halaman Lapangan - sudah ada peta lokasinya.\n\nBisa juga tanya admin untuk rekomendasi lapangan terdekat! 🗺️'
  },
  // Pembatalan / refund
  {
    match: (t) => t.includes('cancel') || t.includes('batal') || t.includes('refund') || t.includes('kembalikan') || t.includes('reschedule') || t.includes('ubah jadwal') || t.includes('ganti jadwal'),
    answer: '❌ Kebijakan Pembatalan:\n\n• Batal ≥24 jam sebelum: refund 100%\n• Batal <24 jam: refund 50%\n• No-show: tidak ada refund\n• Reschedule: maksimal 1x, min 12 jam sebelum\n\nRefund diproses 3-5 hari kerja ke rekening/e-wallet Anda. Hubungi admin untuk proses lebih lanjut! 🙏'
  },
  // Daftar / register
  {
    match: (t) => t.includes('daftar') || t.includes('register') || t.includes('akun baru') || t.includes('sign up') || t.includes('buat akun'),
    answer: '📝 Cara daftar akun SportSpace:\n\n1️⃣ Klik tombol "Daftar" di pojok kanan atas\n2️⃣ Isi nama lengkap, email, dan password\n3️⃣ Klik "Daftar Sekarang"\n4️⃣ Langsung bisa booking!\n\nGratis, mudah, tanpa verifikasi email! 🎉'
  },
  // Promo / diskon
  {
    match: (t) => t.includes('promo') || t.includes('diskon') || t.includes('voucher') || t.includes('potongan') || t.includes('murah') || t.includes('sale'),
    answer: '🎁 Promo SportSpace:\n\n🌅 Early Bird: diskon 10% untuk booking sebelum jam 09.00\n🌙 Off-Peak: harga spesial jam 14.00-17.00 hari kerja\n👥 Group: diskon untuk booking 3+ lapangan sekaligus\n\nTanya admin untuk info promo terkini! 🤩'
  },
  // Terima kasih / bye
  {
    match: (t) => t.includes('terima kasih') || t.includes('makasih') || t.includes('thanks') || t === 'ok' || t === 'oke' || t === 'baik' || t === 'siap' || t.includes('sampai jumpa') || t.includes('bye'),
    answer: '😊 Sama-sama! Senang bisa membantu.\n\nJangan ragu untuk bertanya kapan saja ya! Semoga pengalaman bermain padel Anda menyenangkan! 🏸⭐\n\nSampai jumpa di lapangan! 👋'
  },
  // Kontak admin
  {
    match: (t) => t.includes('admin') || t.includes('cs') || t.includes('customer service') || t.includes('tolong bantu') || t.includes('komplain') || t.includes('masalah'),
    answer: '🛡️ Butuh bantuan admin?\n\nAdmin kami siap membantu! Tuliskan detail masalah atau pertanyaan Anda di sini dan admin akan merespons segera.\n\n⏰ Jam admin aktif: 08.00 - 20.00 WIB\n\nDi luar jam tersebut, AI saya tetap siap 24/7! 🤖'
  },
];

function getRuleBotResponse(message) {
  const lower = message.toLowerCase().trim();

  for (const rule of botRules) {
    try {
      if (rule.match(lower)) {
        return rule.answer;
      }
    } catch (e) {
      // skip if match function errors
    }
  }

  // Intelligent fallback
  return `🤖 Terima kasih sudah menghubungi SportSpace!\n\nSaya belum bisa menjawab pertanyaan tersebut secara otomatis. Admin kami akan segera membalas!\n\n⏰ Jam admin: 08.00 - 20.00 WIB\n\nAtau coba tanyakan:\n• 📅 Cara booking\n• 💰 Harga sewa\n• 🕐 Jam operasional\n• 💳 Metode pembayaran\n• 🏆 Jenis lapangan olahraga`;
}

// ── Optional Gemini AI ────────────────────────────────────────────
let aiModel = null;

async function initGeminiAI() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.log('💡 Menggunakan Rule-Based Bot (Gemini tidak dikonfigurasi)');
      return;
    }
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('🤖 Gemini AI aktif!');
  } catch (err) {
    console.log('⚠️  Gemini gagal:', err.message, '→ fallback ke Rule-Based Bot');
  }
}

async function generateBotResponse(userMessage) {
  if (aiModel) {
    try {
      const prompt = `Kamu CS SportSpace (platform booking lapangan olahraga: futsal, badminton, tenis, basket, padel, dll). Jawab dalam Bahasa Indonesia, ramah, pakai emoji, max 4 kalimat.
Info: harga indoor Rp75rb/jam, outdoor Rp60rb/jam, buka 06-22 WIB setiap hari, bayar via QRIS/transfer/COD/debit.
Pertanyaan: ${userMessage}`;
      const result = await aiModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.error('Gemini error:', err.message);
    }
  }
  return getRuleBotResponse(userMessage);
}

// ── Middleware & Auth ─────────────────────────────────────────────
const { authenticateToken } = require('./middleware/auth');



// ── Optional Socket.IO ────────────────────────────────────────────
function setupSocketIO() {
  try {
    const { Server } = require('socket.io');
    const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
    const connectedUsers = new Map();

    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('No token'));
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      const userId = socket.user.id;
      connectedUsers.set(userId, socket.id);
      io.emit('user_online', { userId, role: socket.user.role });

      socket.on('disconnect', () => {
        connectedUsers.delete(userId);
        io.emit('user_offline', { userId });
      });
    });

    console.log('🔌 Socket.IO ready');
  } catch (err) {
    console.log('⚠️  Socket.IO tidak tersedia (ok, pakai REST fallback)');
  }
}

async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');

    await initGeminiAI();
    setupSocketIO();

    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/courts', require('./routes/courts'));
    app.use('/api/bookings', require('./routes/bookings'));
    app.use('/api/payments', require('./routes/payments'));
    app.use('/api/chat', require('./routes/chat'));

    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    });

    server.listen(PORT, () => {
      console.log(`🏸 Server: http://localhost:${PORT}`);
      console.log(`🤖 Rule-Based Bot: AKTIF`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

startServer();
