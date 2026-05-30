const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'padel.db');
let db = null;

class DatabaseWrapper {
  constructor(sqlJsDb) { this._db = sqlJsDb; }

  _save() {
    try {
      const data = this._db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('DB save error:', e.message);
    }
  }

  exec(sql) { this._db.run(sql); this._save(); }

  pragma(pragmaStr) {
    try { this._db.run(`PRAGMA ${pragmaStr}`); } catch (e) {}
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        try {
          const stmt = self._db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('DB get error:', e.message);
          throw e;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = self._db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            results.push(row);
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('DB all error:', e.message);
          throw e;
        }
      },
      run(...params) {
        try {
          if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
            const namedParams = {};
            for (const [key, value] of Object.entries(params[0])) {
              namedParams[`@${key}`] = value;
            }
            self._db.run(sql, namedParams);
          } else if (params.length > 0) {
            self._db.run(sql, params);
          } else {
            self._db.run(sql);
          }
          self._save();
          const lastId = self._db.exec("SELECT last_insert_rowid() as id");
          const changes = self._db.exec("SELECT changes() as c");
          return {
            lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
            changes: changes.length > 0 ? changes[0].values[0][0] : 0
          };
        } catch (e) {
          console.error('DB run error:', e.message);
          throw e;
        }
      }
    };
  }
}

async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Delete old DB to ensure clean schema
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      const testDb = new SQL.Database(fileBuffer);
      // Check if new tables exist
      const tables = testDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'");
      if (tables.length === 0) {
        console.log('Old schema detected, recreating database...');
        testDb.close();
        fs.unlinkSync(DB_PATH);
        db = new DatabaseWrapper(new SQL.Database());
      } else {
        db = new DatabaseWrapper(testDb);
      }
    } catch (e) {
      console.log('Corrupt DB, recreating...');
      try { fs.unlinkSync(DB_PATH); } catch (x) {}
      db = new DatabaseWrapper(new SQL.Database());
    }
  } else {
    db = new DatabaseWrapper(new SQL.Database());
  }

  db.pragma('foreign_keys = ON');

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    phone TEXT, role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    avatar TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS courts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, description TEXT, location TEXT NOT NULL,
    price_per_hour REAL NOT NULL, image_url TEXT,
    court_type TEXT DEFAULT 'indoor' CHECK(court_type IN ('indoor', 'outdoor')),
    sport_type TEXT DEFAULT 'futsal',
    facilities TEXT, is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration: add sport_type column if not exists
  try {
    db.exec(`ALTER TABLE courts ADD COLUMN sport_type TEXT DEFAULT 'futsal'`);
    console.log('✅ sport_type column added');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: detect old-padel-only data → replace with multi-sport seed
  try {
    const allCourts = db.prepare('SELECT id, name, sport_type FROM courts').all();
    const hasOldData = allCourts.length > 0 && allCourts.every(c =>
      (c.name || '').toLowerCase().includes('padel') ||
      (c.sport_type || '') === 'futsal'
    );
    if (hasOldData) {
      console.log('🔄 Old padel-only courts detected. Re-seeding with multi-sport courts...');
      db.exec('DELETE FROM courts');
    }
  } catch (e) { console.log('Migration check skip:', e.message); }

  // Migration: fix sport_type based on name for any remaining courts
  try {
    const toFix = db.prepare(`SELECT id, name FROM courts WHERE sport_type IS NULL OR sport_type = ''`).all();
    for (const c of toFix) {
      const n = (c.name || '').toLowerCase();
      let st = 'futsal';
      if (n.includes('padel')) st = 'padel';
      else if (n.includes('badminton')) st = 'badminton';
      else if (n.includes('tenis') || n.includes('tennis')) st = 'tennis';
      else if (n.includes('golf')) st = 'golf';
      else if (n.includes('baseball')) st = 'baseball';
      else if (n.includes('basket')) st = 'basketball';
      else if (n.includes('mini soccer') || n.includes('mini_soccer')) st = 'mini_soccer';
      else if (n.includes('sepak bola') || n.includes('soccer') || n.includes('football')) st = 'soccer';
      else if (n.includes('futsal')) st = 'futsal';
      db.prepare(`UPDATE courts SET sport_type = ? WHERE id = ?`).run(st, c.id);
    }
  } catch (e) {}


  db.exec(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, court_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
    duration_hours REAL NOT NULL, total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cod', 'qris', 'bank_transfer', 'debit')),
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    bank_name TEXT, account_number TEXT, card_last_four TEXT,
    transaction_ref TEXT, paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL, receiver_id INTEGER,
    message TEXT NOT NULL, is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Seed admin
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@padel.com');
  if (!adminExists) {
    const hp = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)').run('Admin SportSpace', 'admin@padel.com', hp, '08123456789', 'admin');
  }

  // Seed courts
  const cc = db.prepare('SELECT COUNT(*) as count FROM courts').get();
  const courtImages = [
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80',
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
    'https://images.unsplash.com/photo-1544298621-35a764866aeb?w=800&q=80',
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80',
    'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=800&q=80'
  ];
  if (cc.count === 0) {
    const courts = [
      {
        name: 'Arena Futsal Premium', sport_type: 'futsal',
        description: 'Lapangan futsal indoor premium dengan rumput sintetis berkualitas tinggi. Dilengkapi AC dan sistem pencahayaan LED terbaik untuk kenyamanan bermain.',
        location: 'Jakarta Selatan', price_per_hour: 150000, image_url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80', court_type: 'indoor', facilities: 'AC, LED Lighting, Locker Room, Shower, Parking, Canteen'
      },
      {
        name: 'Mini Soccer Field A', sport_type: 'mini_soccer',
        description: 'Lapangan mini soccer outdoor dengan rumput sintetis premium. Ideal untuk pertandingan 5v5 dan 7v7 dengan pencahayaan malam hari.',
        location: 'Tangerang', price_per_hour: 200000, image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', court_type: 'outdoor', facilities: 'Night Lighting, Spectator Area, Canteen, Parking'
      },
      {
        name: 'Tennis Club Jakarta', sport_type: 'tennis',
        description: 'Lapangan tenis standar internasional dengan permukaan hard court berkualitas tinggi. Cocok untuk latihan dan turnamen profesional.',
        location: 'Jakarta Pusat', price_per_hour: 120000, image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80', court_type: 'outdoor', facilities: 'Hard Court, Lighting, Locker Room, Shower, Parking'
      },
      {
        name: 'Badminton Hall Pro', sport_type: 'badminton',
        description: 'Hall badminton premium dengan 4 lapangan BWF standard. Lantai kayu berkualitas tinggi dan pencahayaan optimal untuk performa terbaik.',
        location: 'Bandung', price_per_hour: 80000, image_url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80', court_type: 'indoor', facilities: 'AC, Wood Floor, 4 Courts, Locker, Shower, Parking'
      },
      {
        name: 'Padel Arena Center', sport_type: 'padel',
        description: 'Lapangan padel indoor premium dengan standar internasional. Dinding kaca tempered dan lantai astroturf berkualitas untuk pengalaman bermain terbaik.',
        location: 'Jakarta Barat', price_per_hour: 250000, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80', court_type: 'indoor', facilities: 'AC, Glass Wall, Astroturf, VIP Lounge, Shower, Parking'
      },
      {
        name: 'Golf Driving Range Elite', sport_type: 'golf',
        description: 'Driving range golf modern dengan 30 bay tee box. Teknologi tracking bola canggih dan instruktur berpengalaman tersedia untuk semua level.',
        location: 'Jakarta Selatan', price_per_hour: 350000, image_url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80', court_type: 'outdoor', facilities: 'Golf Simulator, Pro Shop, Cafe, Parking, Instructor Available'
      },
      {
        name: 'Lapangan Sepak Bola Senayan', sport_type: 'soccer',
        description: 'Lapangan sepak bola full size standar FIFA dengan rumput sintetis generasi terbaru. Kapasitas 400 penonton dengan fasilitas tribune lengkap.',
        location: 'Senayan, Jakarta', price_per_hour: 800000, image_url: 'https://images.unsplash.com/photo-1551958219-acbc3e5d90e7?w=800&q=80', court_type: 'outdoor', facilities: 'Full Size Field, Tribune, Night Lighting, Locker Room, Shower, Parking'
      },
      {
        name: 'Baseball Diamond Park', sport_type: 'baseball',
        description: 'Lapangan baseball profesional dengan diamond layout standar. Dilengkapi batting cage dan pitching mound untuk latihan intensif.',
        location: 'Bali', price_per_hour: 300000, image_url: 'https://images.unsplash.com/photo-1567529742932-07d3f2e4e7b6?w=800&q=80', court_type: 'outdoor', facilities: 'Full Diamond, Batting Cage, Dugout, Lighting, Parking'
      },
    ];
    const ins = db.prepare('INSERT INTO courts (name, description, location, price_per_hour, image_url, court_type, sport_type, facilities) VALUES (@name, @description, @location, @price_per_hour, @image_url, @court_type, @sport_type, @facilities)');
    for (const c of courts) ins.run(c);
  } else {
    // Update existing courts with sport_type if null
    try {
      db.exec(`UPDATE courts SET sport_type = 'futsal' WHERE sport_type IS NULL OR sport_type = ''`);
    } catch(e) {}
  }

  console.log('✅ All tables ready');
  return db;
}

module.exports = { initializeDatabase, getDb: () => db };
