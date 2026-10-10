-- ============================================================
--  WasteLink - MySQL Schema
--  Smart Recyclable Waste Collection and Matching System
-- ============================================================
--  Run with:  mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS wastelink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wastelink;

-- Drop in reverse dependency order so the script is re-runnable.
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS pickups;
DROP TABLE IF EXISTS pickup_requests;
DROP TABLE IF EXISTS waste_listings;
DROP TABLE IF EXISTS organization_profiles;
DROP TABLE IF EXISTS collector_profiles;
DROP TABLE IF EXISTS waste_categories;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  password      VARCHAR(255)  NULL,                -- NULL for Google-only accounts
  phone         VARCHAR(30)   NULL,
  role          ENUM('WASTE_PRODUCER','COLLECTOR','RECYCLING_ORGANIZATION','ADMIN')
                NOT NULL DEFAULT 'WASTE_PRODUCER',
  google_id     VARCHAR(190)  NULL,
  avatar_url    VARCHAR(500)  NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_id (google_id),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- WASTE_CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE waste_categories (
  category_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(80)  NOT NULL,
  description   VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- WASTE_LISTINGS
-- ------------------------------------------------------------
CREATE TABLE waste_listings (
  listing_id    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED   NOT NULL,
  category_id   INT UNSIGNED   NOT NULL,
  quantity      DECIMAL(10,2)  NOT NULL,
  unit          VARCHAR(20)    NOT NULL DEFAULT 'kg',
  location      VARCHAR(190)   NOT NULL,
  description   TEXT           NULL,
  status        ENUM('AVAILABLE','REQUESTED','SCHEDULED','COLLECTED','CANCELLED')
                NOT NULL DEFAULT 'AVAILABLE',
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (listing_id),
  KEY idx_listings_user (user_id),
  KEY idx_listings_category (category_id),
  KEY idx_listings_status (status),
  KEY idx_listings_location (location),
  CONSTRAINT fk_listings_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_listings_category
    FOREIGN KEY (category_id) REFERENCES waste_categories (category_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_listings_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- COLLECTOR_PROFILES
-- ------------------------------------------------------------
CREATE TABLE collector_profiles (
  collector_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             INT UNSIGNED NOT NULL,
  service_area        VARCHAR(190) NOT NULL,
  availability        ENUM('AVAILABLE','UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
  accepted_materials  JSON         NULL,           -- e.g. ["Plastic","Paper"]
  vehicle_type        VARCHAR(80)  NULL,
  bio                 VARCHAR(500) NULL,
  verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  verified_at         TIMESTAMP    NULL DEFAULT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (collector_id),
  UNIQUE KEY uq_collector_user (user_id),
  KEY idx_collector_area (service_area),
  KEY idx_collector_verification (verification_status),
  CONSTRAINT fk_collector_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- ORGANIZATION_PROFILES  (recycling organizations)
-- ------------------------------------------------------------
CREATE TABLE organization_profiles (
  org_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NOT NULL,
  organization_name  VARCHAR(190) NOT NULL,
  address            VARCHAR(190) NULL,
  accepted_materials JSON         NULL,            -- e.g. ["Glass","Metal"]
  description        VARCHAR(500) NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id),
  UNIQUE KEY uq_org_user (user_id),
  CONSTRAINT fk_org_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- PICKUP_REQUESTS
-- ------------------------------------------------------------
CREATE TABLE pickup_requests (
  request_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id   INT UNSIGNED NOT NULL,
  collector_id INT UNSIGNED NOT NULL,              -- COLLECTOR_PROFILES.collector_id
  message      VARCHAR(500) NULL,
  status       ENUM('PENDING','ACCEPTED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_request_listing_collector (listing_id, collector_id),
  KEY idx_request_listing (listing_id),
  KEY idx_request_collector (collector_id),
  KEY idx_request_status (status),
  CONSTRAINT fk_request_listing
    FOREIGN KEY (listing_id) REFERENCES waste_listings (listing_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_request_collector
    FOREIGN KEY (collector_id) REFERENCES collector_profiles (collector_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- PICKUPS
-- ------------------------------------------------------------
CREATE TABLE pickups (
  pickup_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id     INT UNSIGNED NOT NULL,
  scheduled_date DATETIME     NOT NULL,
  status         ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  notes          VARCHAR(500) NULL,
  completed_at   TIMESTAMP    NULL DEFAULT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (pickup_id),
  UNIQUE KEY uq_pickup_request (request_id),
  KEY idx_pickup_status (status),
  KEY idx_pickup_date (scheduled_date),
  CONSTRAINT fk_pickup_request
    FOREIGN KEY (request_id) REFERENCES pickup_requests (request_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- FEEDBACK
-- ------------------------------------------------------------
CREATE TABLE feedback (
  feedback_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pickup_id   INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     VARCHAR(500) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (feedback_id),
  UNIQUE KEY uq_feedback_pickup_user (pickup_id, user_id),
  KEY idx_feedback_pickup (pickup_id),
  CONSTRAINT fk_feedback_pickup
    FOREIGN KEY (pickup_id) REFERENCES pickups (pickup_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_feedback_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed the fixed waste categories
-- ------------------------------------------------------------
INSERT INTO waste_categories (category_name, description) VALUES
  ('Plastic',          'Plastic bottles, containers and packaging'),
  ('Paper',            'Newspapers, office paper and magazines'),
  ('Cardboard',        'Cardboard boxes and packaging board'),
  ('Glass',            'Glass bottles and jars'),
  ('Metal',            'Aluminium cans, scrap metal and tins'),
  ('Electronic Waste', 'E-waste: phones, cables, computers and batteries');
