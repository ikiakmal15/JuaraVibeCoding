-- ============================================================
--  SportSpace Database Export
--  Compatible: MySQL 5.7+ / MariaDB 10.3+ / XAMPP
--  Generated: 2026-05-30
--  Charset: utf8mb4
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+07:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ------------------------------------------------------------
-- Database: sportspace
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `sportspace`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sportspace`;

-- ============================================================
-- TABLE: users
-- ============================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(150)     NOT NULL,
  `email`      VARCHAR(150)     NOT NULL,
  `password`   VARCHAR(255)     NOT NULL,
  `phone`      VARCHAR(20)      DEFAULT NULL,
  `role`       ENUM('user','admin') NOT NULL DEFAULT 'user',
  `avatar`     VARCHAR(500)     DEFAULT NULL,
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: default admin account (password: admin123)
-- Hash dibuat dengan bcrypt cost=10
INSERT INTO `users` (`name`, `email`, `password`, `phone`, `role`) VALUES
('Admin SportSpace', 'admin@padel.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lM', '08123456789', 'admin');

-- ============================================================
-- TABLE: courts
-- ============================================================
DROP TABLE IF EXISTS `courts`;
CREATE TABLE `courts` (
  `id`             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(150)     NOT NULL,
  `description`    TEXT             DEFAULT NULL,
  `location`       VARCHAR(200)     NOT NULL,
  `price_per_hour` DECIMAL(12,2)    NOT NULL,
  `image_url`      VARCHAR(500)     DEFAULT NULL,
  `court_type`     ENUM('indoor','outdoor') NOT NULL DEFAULT 'indoor',
  `sport_type`     VARCHAR(50)      NOT NULL DEFAULT 'futsal'
                     COMMENT 'futsal|mini_soccer|soccer|tennis|badminton|padel|golf|baseball|basketball',
  `facilities`     TEXT             DEFAULT NULL,
  `is_active`      TINYINT(1)       NOT NULL DEFAULT 1,
  `created_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courts_sport_type`  (`sport_type`),
  KEY `idx_courts_court_type`  (`court_type`),
  KEY `idx_courts_is_active`   (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: default courts
INSERT INTO `courts` (`name`, `description`, `location`, `price_per_hour`, `image_url`, `court_type`, `sport_type`, `facilities`) VALUES
(
  'Arena Futsal Premium', 
  'Lapangan futsal indoor premium dengan rumput sintetis berkualitas tinggi. Dilengkapi AC dan sistem pencahayaan LED terbaik untuk kenyamanan bermain.',
  'Jakarta Selatan', 150000.00,
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80',
  'indoor', 'futsal',
  'AC, LED Lighting, Locker Room, Shower, Parking, Canteen'
),
(
  'Mini Soccer Field A',
  'Lapangan mini soccer outdoor dengan rumput sintetis premium. Ideal untuk pertandingan 5v5 dan 7v7 dengan pencahayaan malam hari.',
  'Tangerang', 200000.00,
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  'outdoor', 'mini_soccer',
  'Night Lighting, Spectator Area, Canteen, Parking'
),
(
  'Tennis Club Jakarta',
  'Lapangan tenis standar internasional dengan permukaan hard court berkualitas tinggi. Cocok untuk latihan dan turnamen profesional.',
  'Jakarta Pusat', 120000.00,
  'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80',
  'outdoor', 'tennis',
  'Hard Court, Lighting, Locker Room, Shower, Parking'
),
(
  'Badminton Hall Pro',
  'Hall badminton premium dengan 4 lapangan BWF standard. Lantai kayu berkualitas tinggi dan pencahayaan optimal untuk performa terbaik.',
  'Bandung', 80000.00,
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',
  'indoor', 'badminton',
  'AC, Wood Floor, 4 Courts, Locker, Shower, Parking'
),
(
  'Padel Arena Center',
  'Lapangan padel indoor premium dengan standar internasional. Dinding kaca tempered dan lantai astroturf berkualitas untuk pengalaman bermain terbaik.',
  'Jakarta Barat', 250000.00,
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
  'indoor', 'padel',
  'AC, Glass Wall, Astroturf, VIP Lounge, Shower, Parking'
),
(
  'Golf Driving Range Elite',
  'Driving range golf modern dengan 30 bay tee box. Teknologi tracking bola canggih dan instruktur berpengalaman tersedia untuk semua level.',
  'Jakarta Selatan', 350000.00,
  'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80',
  'outdoor', 'golf',
  'Golf Simulator, Pro Shop, Cafe, Parking, Instructor Available'
),
(
  'Lapangan Sepak Bola Senayan',
  'Lapangan sepak bola full size standar FIFA dengan rumput sintetis generasi terbaru. Kapasitas 400 penonton dengan fasilitas tribune lengkap.',
  'Senayan, Jakarta', 800000.00,
  'https://images.unsplash.com/photo-1551958219-acbc3e5d90e7?w=800&q=80',
  'outdoor', 'soccer',
  'Full Size Field, Tribune, Night Lighting, Locker Room, Shower, Parking'
),
(
  'Baseball Diamond Park',
  'Lapangan baseball profesional dengan diamond layout standar. Dilengkapi batting cage dan pitching mound untuk latihan intensif.',
  'Bali', 300000.00,
  'https://images.unsplash.com/photo-1567529742932-07d3f2e4e7b6?w=800&q=80',
  'outdoor', 'baseball',
  'Full Diamond, Batting Cage, Dugout, Lighting, Parking'
);

-- ============================================================
-- TABLE: bookings
-- ============================================================
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id`             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED     NOT NULL,
  `court_id`       INT UNSIGNED     NOT NULL,
  `booking_date`   DATE             NOT NULL,
  `start_time`     TIME             NOT NULL,
  `end_time`       TIME             NOT NULL,
  `duration_hours` DECIMAL(4,2)     NOT NULL,
  `total_price`    DECIMAL(12,2)    NOT NULL,
  `status`         ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  `notes`          TEXT             DEFAULT NULL,
  `created_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bookings_user_id`    (`user_id`),
  KEY `idx_bookings_court_id`   (`court_id`),
  KEY `idx_bookings_status`     (`status`),
  KEY `idx_bookings_date`       (`booking_date`),
  CONSTRAINT `fk_bookings_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_court` FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: payments
-- ============================================================
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id`               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `booking_id`       INT UNSIGNED     NOT NULL,
  `user_id`          INT UNSIGNED     NOT NULL,
  `amount`           DECIMAL(12,2)    NOT NULL,
  `payment_method`   ENUM('cod','qris','bank_transfer','debit') NOT NULL,
  `payment_status`   ENUM('pending','paid','failed','refunded')  NOT NULL DEFAULT 'pending',
  `bank_name`        VARCHAR(100)     DEFAULT NULL,
  `account_number`   VARCHAR(50)      DEFAULT NULL,
  `card_last_four`   CHAR(4)          DEFAULT NULL,
  `transaction_ref`  VARCHAR(100)     DEFAULT NULL,
  `paid_at`          DATETIME         DEFAULT NULL,
  `created_at`       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_booking_id`    (`booking_id`),
  KEY `idx_payments_user_id`       (`user_id`),
  KEY `idx_payments_status`        (`payment_status`),
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: chat_messages
-- ============================================================
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `sender_id`   INT UNSIGNED  NOT NULL,
  `receiver_id` INT UNSIGNED  DEFAULT NULL,
  `message`     TEXT          NOT NULL,
  `is_read`     TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_sender`   (`sender_id`),
  KEY `idx_chat_receiver` (`receiver_id`),
  KEY `idx_chat_read`     (`is_read`),
  CONSTRAINT `fk_chat_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DONE
-- ============================================================
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
