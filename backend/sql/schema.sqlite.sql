CREATE TABLE IF NOT EXISTS sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  national_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT NOT NULL UNIQUE,
  plate_display TEXT NOT NULL,
  make TEXT, model TEXT, year INTEGER, chassis TEXT,
  vehicle_class TEXT DEFAULT 'private',
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS insurance_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT NOT NULL,
  certificate_no TEXT NOT NULL UNIQUE,
  policy_no TEXT, insurer_code TEXT NOT NULL, insurer_name TEXT NOT NULL,
  certificate_class TEXT, cover_type TEXT, policyholder TEXT,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL,
  persons_entitled TEXT, premium_rwf INTEGER,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cert_plate ON insurance_certificates(plate);
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT NOT NULL, seller_id INTEGER, result TEXT NOT NULL,
  searched_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS history_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE, plate TEXT NOT NULL, seller_id INTEGER NOT NULL,
  digest TEXT NOT NULL, generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER, national_id_last4 TEXT,
  event TEXT NOT NULL, ip TEXT,
  logged_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_seller ON login_logs(seller_id);
