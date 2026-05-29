-- api2.autisme.lu initial schema
-- MySQL/MariaDB compatible, UTF-8 everywhere.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role ENUM('admin','chef','cathy','billing','user','legacy','system') NOT NULL DEFAULT 'user',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  user_agent VARCHAR(500) NULL,
  ip_address VARCHAR(80) NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_api_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_api_sessions_user (user_id),
  INDEX idx_api_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(120) NOT NULL PRIMARY KEY,
  value_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS places (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  legacy_id BIGINT UNSIGNED NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  group_key VARCHAR(80) NULL,
  group_label VARCHAR(120) NULL,
  time_label VARCHAR(120) NULL,
  columns_count INT NOT NULL DEFAULT 1,
  blocks_meal_entry TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_places_active (active),
  INDEX idx_places_sort (sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS people (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  legacy_id BIGINT UNSIGNED NULL UNIQUE,
  last_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NULL,
  birth_date DATE NULL,
  photo_url VARCHAR(500) NULL,
  is_encadrant TINYINT(1) NOT NULL DEFAULT 0,
  has_base_plan TINYINT(1) NOT NULL DEFAULT 1,
  meal_registration_enabled TINYINT(1) NOT NULL DEFAULT 1,
  billing_category VARCHAR(80) NULL,
  default_place_id BIGINT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  notes TEXT NULL,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_people_default_place FOREIGN KEY (default_place_id) REFERENCES places(id) ON DELETE SET NULL,
  INDEX idx_people_name (last_name, first_name),
  INDEX idx_people_active_menu (active, meal_registration_enabled),
  INDEX idx_people_billing (billing_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_choices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  label_lb VARCHAR(120) NOT NULL,
  label_fr VARCHAR(120) NULL,
  short_label VARCHAR(40) NULL,
  is_no_meal TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_meal_choices_active (active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_menus (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  monday_date DATE NOT NULL UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  title VARCHAR(255) NULL,
  menu_json JSON NOT NULL,
  exports_json JSON NOT NULL,
  public_hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_menus_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_weekly_menus_date (monday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  url VARCHAR(500) NOT NULL,
  kind VARCHAR(40) NOT NULL DEFAULT 'image',
  alt_text VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu_assets_kind (kind, active),
  INDEX idx_menu_assets_sha (sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS base_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  person_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NULL,
  meal_choice_id BIGINT UNSIGNED NULL,
  comment TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_base_plans_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  CONSTRAINT fk_base_plans_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL,
  CONSTRAINT fk_base_plans_choice FOREIGN KEY (meal_choice_id) REFERENCES meal_choices(id) ON DELETE SET NULL,
  UNIQUE KEY uq_base_plan_person_weekday (person_id, weekday),
  INDEX idx_base_plans_place_weekday (place_id, weekday),
  CHECK (weekday BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_registrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  person_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  place_id BIGINT UNSIGNED NULL,
  meal_choice_id BIGINT UNSIGNED NULL,
  comment TEXT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  status VARCHAR(40) NOT NULL DEFAULT 'confirmed',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_meal_reg_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  CONSTRAINT fk_meal_reg_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL,
  CONSTRAINT fk_meal_reg_choice FOREIGN KEY (meal_choice_id) REFERENCES meal_choices(id) ON DELETE SET NULL,
  CONSTRAINT fk_meal_reg_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_meal_registration_person_date (person_id, date),
  INDEX idx_meal_reg_date_place (date, place_id),
  INDEX idx_meal_reg_choice (meal_choice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserved_dates (
  date DATE NOT NULL PRIMARY KEY,
  label VARCHAR(255) NULL,
  mode VARCHAR(40) NOT NULL DEFAULT 'reserved',
  force_no_meal TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reserved_dates_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS non_billable_dates (
  date DATE NOT NULL PRIMARY KEY,
  label VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_non_billable_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS generated_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(80) NOT NULL,
  filename VARCHAR(255) NOT NULL UNIQUE,
  url VARCHAR(500) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  filters_json JSON NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_generated_reports_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_generated_reports_type (type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(80) NOT NULL,
  recipient VARCHAR(255) NULL,
  subject VARCHAR(255) NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  error_text TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_jobs_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email_jobs_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS imports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(80) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'previewed',
  preview_json JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_imports_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_plan_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  person_id BIGINT UNSIGNED NOT NULL,
  block1_place_id BIGINT UNSIGNED NULL,
  block2_place_id BIGINT UNSIGNED NULL,
  block3_place_id BIGINT UNSIGNED NULL,
  block4_place_id BIGINT UNSIGNED NULL,
  info_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_plan_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE KEY uq_work_plan_date_person (date, person_id),
  INDEX idx_work_plan_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clothing_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article VARCHAR(255) NOT NULL,
  description TEXT NULL,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  type_label VARCHAR(120) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clothing_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  person_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NULL,
  quantity INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  size_label VARCHAR(80) NULL,
  remark TEXT NULL,
  ok TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clothing_assign_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  CONSTRAINT fk_clothing_assign_item FOREIGN KEY (item_id) REFERENCES clothing_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_clothing_assign_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_associations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  vat_number VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  postal_code VARCHAR(40) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  association_id BIGINT UNSIGNED NULL,
  phone VARCHAR(80) NULL,
  email VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_clients_association FOREIGN KEY (association_id) REFERENCES commande_associations(id) ON DELETE SET NULL,
  INDEX idx_commande_clients_name (name, surname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  postal_code VARCHAR(40) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  client_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_addresses_client FOREIGN KEY (client_id) REFERENCES commande_clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_code VARCHAR(40) NULL,
  supplier_id BIGINT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  is_composed TINYINT(1) NOT NULL DEFAULT 0,
  is_variable TINYINT(1) NOT NULL DEFAULT 0,
  stock_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_products_supplier FOREIGN KEY (supplier_id) REFERENCES commande_suppliers(id) ON DELETE SET NULL,
  INDEX idx_commande_products_active (active, visible),
  INDEX idx_commande_products_desc (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_product_components (
  parent_product_id BIGINT UNSIGNED NOT NULL,
  component_product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  PRIMARY KEY (parent_product_id, component_product_id),
  CONSTRAINT fk_commande_comp_parent FOREIGN KEY (parent_product_id) REFERENCES commande_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_commande_comp_component FOREIGN KEY (component_product_id) REFERENCES commande_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT UNSIGNED NOT NULL,
  due_date DATE NULL,
  delivery_date DATE NULL,
  description TEXT NULL,
  delivery_address_id BIGINT UNSIGNED NULL,
  collect_info TEXT NULL,
  delivery_note VARCHAR(120) NULL,
  created_by_person_id BIGINT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_orders_client FOREIGN KEY (client_id) REFERENCES commande_clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_commande_orders_address FOREIGN KEY (delivery_address_id) REFERENCES commande_addresses(id) ON DELETE SET NULL,
  INDEX idx_commande_orders_due (due_date, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_order_positions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  completed_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_by_person_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_positions_order FOREIGN KEY (order_id) REFERENCES commande_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_commande_positions_product FOREIGN KEY (product_id) REFERENCES commande_products(id) ON DELETE RESTRICT,
  INDEX idx_commande_positions_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_order_position_subs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  position_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_subs_position FOREIGN KEY (position_id) REFERENCES commande_order_positions(id) ON DELETE CASCADE,
  CONSTRAINT fk_commande_subs_product FOREIGN KEY (product_id) REFERENCES commande_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  total_after DECIMAL(10,3) NOT NULL DEFAULT 0,
  modification DECIMAL(10,3) NOT NULL DEFAULT 0,
  order_position_id BIGINT UNSIGNED NULL,
  motif VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_stock_product FOREIGN KEY (product_id) REFERENCES commande_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_commande_stock_position FOREIGN KEY (order_position_id) REFERENCES commande_order_positions(id) ON DELETE SET NULL,
  INDEX idx_commande_stock_product (product_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'lb',
  body LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_word_forms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'lb',
  metadata_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_translation_word_forms_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_meanings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  word_form_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'de',
  audio_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_translation_meanings_word (word_form_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_occurrences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article_id BIGINT UNSIGNED NOT NULL,
  word_form_id BIGINT UNSIGNED NULL,
  source VARCHAR(80) NULL,
  position INT NOT NULL DEFAULT 0,
  text_before TEXT NULL,
  text_value TEXT NULL,
  text_after TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_translation_occ_article FOREIGN KEY (article_id) REFERENCES translation_articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_translation_occ_word FOREIGN KEY (word_form_id) REFERENCES translation_word_forms(id) ON DELETE SET NULL,
  INDEX idx_translation_occ_article (article_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_audio (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NULL,
  custom TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_occurrence_meanings (
  occurrence_id BIGINT UNSIGNED NOT NULL,
  meaning_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (occurrence_id, meaning_id),
  CONSTRAINT fk_translation_om_occ FOREIGN KEY (occurrence_id) REFERENCES translation_occurrences(id) ON DELETE CASCADE,
  CONSTRAINT fk_translation_om_meaning FOREIGN KEY (meaning_id) REFERENCES translation_meanings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
