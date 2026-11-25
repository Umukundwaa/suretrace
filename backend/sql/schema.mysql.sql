CREATE DATABASE IF NOT EXISTS suretrace CHARACTER SET utf8mb4;
USE suretrace;

CREATE TABLE IF NOT EXISTS sellers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  national_id   CHAR(16) NOT NULL UNIQUE,
  full_name     VARCHAR(120) NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  plate     VARCHAR(12) NOT NULL UNIQUE,   -- normalised, e.g. RAD123A
  plate_display VARCHAR(16) NOT NULL,
  make      VARCHAR(60),
  model     VARCHAR(60),
  year      INT,
  chassis   VARCHAR(32),
  vehicle_class VARCHAR(12) DEFAULT 'private',
  seller_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
);

-- Cache of certificates pulled from the insurer API (ActiveCertificate / ExpiredCertificate
-- in the class diagram are derived from end_date at read time, not stored as separate tables)
CREATE TABLE IF NOT EXISTS insurance_certificates (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  plate          VARCHAR(12) NOT NULL,
  certificate_no VARCHAR(40) NOT NULL UNIQUE,
  policy_no      VARCHAR(40),
  insurer_code   VARCHAR(16) NOT NULL,
  insurer_name   VARCHAR(120) NOT NULL,
  certificate_class VARCHAR(12),
  cover_type     VARCHAR(30),
  policyholder   VARCHAR(120),
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  persons_entitled TEXT,
  premium_rwf    INT,
  fetched_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cert_plate (plate)
);

CREATE TABLE IF NOT EXISTS search_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  plate      VARCHAR(12) NOT NULL,
  seller_id  INT NULL,
  result     VARCHAR(12) NOT NULL,         -- active | expired | notfound
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_seller (seller_id)
);

-- Issued history reports; the QR code on the PDF points at /verify/<ref>
CREATE TABLE IF NOT EXISTS history_reports (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ref        VARCHAR(40) NOT NULL UNIQUE,
  plate      VARCHAR(12) NOT NULL,
  seller_id  INT NOT NULL,
  digest     CHAR(64) NOT NULL,            -- SHA-256 of the report content
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail (NFR 8): every sign-up, successful login and failed login attempt
CREATE TABLE IF NOT EXISTS login_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  seller_id  INT NULL,
  national_id_last4 CHAR(4),
  event      VARCHAR(20) NOT NULL,          -- register | login | login_failed
  ip         VARCHAR(45),
  logged_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_seller (seller_id)
);
