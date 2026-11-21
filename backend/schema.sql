-- =====================================================================
-- Guinhawa Poultry Supply Management System
-- MySQL / MariaDB schema for XAMPP (database: guinhawa_db)
--
-- Import the generated `guinhawa_db.sql` in phpMyAdmin instead of this
-- file when you want the product master list loaded as well. This file
-- contains the table definitions only.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS guinhawa_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE guinhawa_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS held_orders;
DROP TABLE IF EXISTS held_order_items;
DROP TABLE IF EXISTS stock_in;
DROP TABLE IF EXISTS stock_out;
DROP TABLE IF EXISTS inventory_history;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS supplier_deliveries;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS account_audit_logs;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS user_appearance_settings;
DROP TABLE IF EXISTS staff_email_verifications;
DROP TABLE IF EXISTS account_activation_tokens;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS admin;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Exactly one administrator. The CHECK constraint plus the fixed primary
-- key make a second row impossible; the setup script fills row 1 only.
-- ---------------------------------------------------------------------
CREATE TABLE admin (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    username VARCHAR(60) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NULL,
    contact_number VARCHAR(40) NULL,
    avatar MEDIUMTEXT NULL,
    password_hash VARCHAR(255) NOT NULL,
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    last_login_at DATETIME NULL,
    password_changed_at DATETIME NULL,
    temp_password_expires_at DATETIME NULL,
    session_version INT UNSIGNED NOT NULL DEFAULT 1,
    failed_login_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_username (username),
    CONSTRAINT chk_admin_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Counter Staff and Inventory Staff only. There is intentionally no
-- 'admin' role here: the administrator lives in the admin table.
-- ---------------------------------------------------------------------
CREATE TABLE employees (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id VARCHAR(40) NOT NULL,
    username VARCHAR(60) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    contact_number VARCHAR(40) NULL,
    avatar MEDIUMTEXT NULL,
    role ENUM('cashier', 'counter-staff', 'inventory-staff', 'staff') NOT NULL DEFAULT 'cashier',
    date_joined DATE NULL,
    -- 'pending' accounts were created by an Admin and wait for the staff
    -- member to open the single-use email activation link and set a password.
    status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
    password_hash VARCHAR(255) NOT NULL,
    must_change_password TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    password_changed_at DATETIME NULL,
    temp_password_expires_at DATETIME NULL,
    session_version INT UNSIGNED NOT NULL DEFAULT 1,
    failed_login_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    -- Soft delete: the row is hidden from the directory but every detail,
    -- sale, attendance entry and audit log stays linked to this account.
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(160) NULL,
    created_by VARCHAR(60) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_employees_employee_id (employee_id),
    UNIQUE KEY uq_employees_username (username),
    UNIQUE KEY uq_employees_email (email),
    KEY idx_employees_role_status (role, status),
    KEY idx_employees_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------
CREATE TABLE products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku VARCHAR(40) NOT NULL,
    barcode VARCHAR(80) NULL,
    name VARCHAR(190) NOT NULL,
    category VARCHAR(60) NOT NULL,
    subcategory VARCHAR(120) NOT NULL DEFAULT '',
    brand VARCHAR(120) NOT NULL DEFAULT '',
    description TEXT NULL,
    minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sack_weight_kg DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    expiration_date DATE NULL,
    supplier VARCHAR(160) NOT NULL DEFAULT '',
    image VARCHAR(600) NOT NULL DEFAULT '',
    review ENUM('Listed', 'Verify') NOT NULL DEFAULT 'Listed',
    notes TEXT NULL,
    source VARCHAR(160) NOT NULL DEFAULT '',
    sheet_row INT NULL,
    awaiting_stock TINYINT(1) NOT NULL DEFAULT 1,
    archived TINYINT(1) NOT NULL DEFAULT 0,
    archived_at DATETIME NULL,
    archived_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_sku (sku),
    UNIQUE KEY uq_products_barcode (barcode),
    KEY idx_products_category (category, subcategory),
    KEY idx_products_archived (archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_variants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id INT UNSIGNED NOT NULL,
    variant_key ENUM('A', 'B') NOT NULL,
    label VARCHAR(40) NOT NULL DEFAULT 'Price A',
    unit VARCHAR(40) NOT NULL DEFAULT 'Units',
    unit_raw VARCHAR(80) NOT NULL DEFAULT '',
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
    assumed TINYINT(1) NOT NULL DEFAULT 0,
    unit_verified TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_variants_product_key (product_id, variant_key),
    UNIQUE KEY uq_variants_product_unit (product_id, unit),
    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock levels live here, one row per selling unit. PostgreSQL/MySQL both
-- keep this separate from the price metadata so every movement can be
-- audited against a single quantity column.
CREATE TABLE inventory (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id INT UNSIGNED NOT NULL,
    variant_key ENUM('A', 'B') NOT NULL,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_product_key (product_id, variant_key),
    CONSTRAINT fk_inventory_variant
        FOREIGN KEY (product_id, variant_key)
        REFERENCES product_variants (product_id, variant_key)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Suppliers, customers, orders
-- ---------------------------------------------------------------------
CREATE TABLE suppliers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(160) NOT NULL,
    contact VARCHAR(60) NOT NULL,
    email VARCHAR(190) NULL,
    address VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_suppliers_code (code),
    UNIQUE KEY uq_suppliers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(160) NOT NULL,
    contact VARCHAR(60) NOT NULL DEFAULT '',
    email VARCHAR(190) NULL,
    address VARCHAR(255) NOT NULL DEFAULT '',
    orders_count INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    last_order VARCHAR(40) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_no VARCHAR(30) NULL,
    customer VARCHAR(160) NOT NULL,
    customer_id VARCHAR(20) NULL,
    product_id INT UNSIGNED NULL,
    product VARCHAR(190) NOT NULL,
    variant_key ENUM('A', 'B') NOT NULL DEFAULT 'A',
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit VARCHAR(40) NOT NULL DEFAULT 'Units',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    message TEXT NULL,
    order_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_order_no (order_no),
    KEY idx_orders_status (status),
    CONSTRAINT fk_orders_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Inventory movements
-- ---------------------------------------------------------------------
CREATE TABLE inventory_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reference VARCHAR(40) NOT NULL,
    product_id INT UNSIGNED NULL,
    variant_key ENUM('A', 'B') NOT NULL DEFAULT 'A',
    product_name VARCHAR(190) NOT NULL,
    unit VARCHAR(40) NOT NULL DEFAULT 'Units',
    action ENUM('Stock In', 'Stock Out', 'Adjustment', 'Damaged', 'Expired') NOT NULL,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    previous_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    next_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    remarks VARCHAR(500) NOT NULL DEFAULT '',
    user_label VARCHAR(160) NOT NULL DEFAULT '',
    actor_type ENUM('admin', 'employee') NULL,
    actor_id INT UNSIGNED NULL,
    movement_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_history_reference (reference),
    KEY idx_history_product (product_id),
    KEY idx_history_action_date (action, movement_date),
    CONSTRAINT fk_history_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_in (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    history_id BIGINT UNSIGNED NULL,
    reference VARCHAR(40) NOT NULL,
    product_id INT UNSIGNED NULL,
    variant_key ENUM('A', 'B') NOT NULL DEFAULT 'A',
    product_name VARCHAR(190) NOT NULL,
    unit VARCHAR(40) NOT NULL DEFAULT 'Units',
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    previous_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    new_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    supplier_id INT UNSIGNED NULL,
    supplier_name VARCHAR(160) NOT NULL DEFAULT '',
    remarks VARCHAR(500) NOT NULL DEFAULT '',
    user_label VARCHAR(160) NOT NULL DEFAULT '',
    is_delivery TINYINT(1) NOT NULL DEFAULT 0,
    received_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_stock_in_reference (reference),
    KEY idx_stock_in_supplier (supplier_id),
    CONSTRAINT fk_stock_in_history
        FOREIGN KEY (history_id) REFERENCES inventory_history (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_in_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_in_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_out (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    history_id BIGINT UNSIGNED NULL,
    reference VARCHAR(40) NOT NULL,
    product_id INT UNSIGNED NULL,
    variant_key ENUM('A', 'B') NOT NULL DEFAULT 'A',
    product_name VARCHAR(190) NOT NULL,
    unit VARCHAR(40) NOT NULL DEFAULT 'Units',
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    previous_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    new_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    customer VARCHAR(160) NOT NULL DEFAULT '',
    reason VARCHAR(60) NOT NULL DEFAULT 'Customer Order',
    remarks VARCHAR(500) NOT NULL DEFAULT '',
    user_label VARCHAR(160) NOT NULL DEFAULT '',
    issued_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_stock_out_reference (reference),
    KEY idx_stock_out_reason (reason),
    CONSTRAINT fk_stock_out_history
        FOREIGN KEY (history_id) REFERENCES inventory_history (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_out_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Sales / receipts (POS)
-- ---------------------------------------------------------------------
CREATE TABLE sales (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    receipt_no VARCHAR(30) NOT NULL,
    customer VARCHAR(160) NOT NULL DEFAULT 'Walk-in Customer',
    customer_id VARCHAR(20) NULL,
    order_type ENUM('Walk-in', 'Online') NOT NULL DEFAULT 'Walk-in',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method ENUM('Cash', 'GCash') NOT NULL DEFAULT 'Cash',
    amount_tendered DECIMAL(12,2) NOT NULL DEFAULT 0,
    change_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Paid',
    cashier VARCHAR(160) NOT NULL DEFAULT '',
    staff_id VARCHAR(40) NOT NULL DEFAULT '',
    transaction_id VARCHAR(80) NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_receipt (receipt_no),
    UNIQUE KEY uq_sales_transaction (transaction_id),
    KEY idx_sales_date (sale_date),
    KEY idx_sales_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sale_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sale_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    variant_key ENUM('A', 'B') NOT NULL DEFAULT 'A',
    product_name VARCHAR(190) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT '',
    unit VARCHAR(40) NOT NULL DEFAULT 'Units',
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_sale_items_sale (sale_id),
    CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (sale_id) REFERENCES sales (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sale_items_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suspended POS carts. The line data is kept as JSON because it is a
-- short-lived snapshot of exactly what the cashier had on screen.
CREATE TABLE held_orders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    hold_no VARCHAR(30) NOT NULL,
    items_json LONGTEXT NOT NULL,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method ENUM('Cash', 'GCash') NOT NULL DEFAULT 'Cash',
    order_type ENUM('Walk-in', 'Online') NOT NULL DEFAULT 'Walk-in',
    amount_tendered VARCHAR(40) NOT NULL DEFAULT '',
    cashier VARCHAR(160) NOT NULL DEFAULT '',
    hold_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_held_orders_no (hold_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
CREATE TABLE attendance (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_code VARCHAR(40) NOT NULL,
    employee_name VARCHAR(160) NOT NULL,
    work_date DATE NOT NULL,
    clock_in TIME NULL,
    clock_out TIME NULL,
    hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT '',
    note VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_day (employee_code, work_date),
    KEY idx_attendance_date (work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Audit logs
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor VARCHAR(160) NOT NULL DEFAULT '',
    actor_type ENUM('admin', 'employee') NULL,
    actor_id INT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    details VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_created (created_at),
    KEY idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE account_audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_type ENUM('admin', 'employee') NULL,
    actor_id INT UNSIGNED NULL,
    actor_name VARCHAR(160) NOT NULL,
    action VARCHAR(80) NOT NULL,
    target_employee_id VARCHAR(40) NULL,
    details VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_account_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Store settings (one row)
-- ---------------------------------------------------------------------
CREATE TABLE settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    store_name VARCHAR(160) NOT NULL DEFAULT 'Guinhawa Poultry Supply',
    owner VARCHAR(160) NOT NULL DEFAULT '',
    email VARCHAR(190) NOT NULL DEFAULT '',
    phone VARCHAR(60) NOT NULL DEFAULT '',
    address VARCHAR(255) NOT NULL DEFAULT '',
    business_hours VARCHAR(160) NOT NULL DEFAULT '',
    description VARCHAR(500) NOT NULL DEFAULT '',
    receipt_footer VARCHAR(255) NOT NULL DEFAULT '',
    low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10,
    currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
    date_format VARCHAR(30) NOT NULL DEFAULT 'MMM DD, YYYY',
    email_notifications TINYINT(1) NOT NULL DEFAULT 1,
    inventory_alerts TINYINT(1) NOT NULL DEFAULT 1,
    order_notifications TINYINT(1) NOT NULL DEFAULT 1,
    gcash_qr MEDIUMTEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (id, store_name, email, phone, address, business_hours, description, low_stock_threshold, gcash_qr)
VALUES (1, 'Guinhawa Poultry Supply', 'hello@guinhawapoultry.com', '+63 917 123 4567',
        'Guinhawa, Malolos, Bulacan', 'Monday - Saturday, 8:00 AM - 5:00 PM',
        'Quality supplies. Healthy poultry. Happy farmers.', 10, '/qqr.jpg');

-- ---------------------------------------------------------------------
-- Per-account appearance preferences.
--
-- The system keeps administrators in `admin` and employees in `employees`,
-- so a single foreign-key column cannot reference both tables. The pair
-- (user_type, user_id) is the account identity and the unique key below
-- guarantees exactly one appearance row per account. The API only ever
-- writes the row of the signed-in session, so accounts stay isolated.
-- ---------------------------------------------------------------------
CREATE TABLE user_appearance_settings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_type ENUM('admin', 'employee') NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    theme_mode ENUM('light', 'dark') NOT NULL DEFAULT 'light',
    accent_color ENUM('forest', 'fresh', 'deep', 'olive') NOT NULL DEFAULT 'forest',
    font_size ENUM('small', 'medium', 'large') NOT NULL DEFAULT 'medium',
    sidebar_state ENUM('expanded', 'collapsed') NOT NULL DEFAULT 'expanded',
    interface_density ENUM('comfortable', 'compact') NOT NULL DEFAULT 'comfortable',
    reduce_animations TINYINT(1) NOT NULL DEFAULT 0,
    preferences JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_appearance_account (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Authentication: password recovery, sessions and persistent sign-in.
-- Only hashes are stored. OTPs, recovery codes and remember tokens are
-- never written to this schema in plain text.
-- ---------------------------------------------------------------------
CREATE TABLE password_reset_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_type ENUM('admin', 'employee') NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    email VARCHAR(190) NOT NULL,
    channel ENUM('email', 'recovery_code') NOT NULL DEFAULT 'email',
    otp_hash VARCHAR(255) NULL,
    reset_token_hash CHAR(64) NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
    requested_ip VARCHAR(45) NOT NULL DEFAULT '',
    expires_at DATETIME NOT NULL,
    token_expires_at DATETIME NULL,
    consumed_at DATETIME NULL,
    reset_completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_prr_user (user_type, user_id, created_at),
    KEY idx_prr_email (email, created_at),
    KEY idx_prr_expiry (expires_at),
    KEY idx_prr_token (reset_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Staff account activation. The Admin creates a 'pending' employee, a
-- 32-byte token is emailed, and only its SHA-256 hash is stored here.
-- Tokens expire after 24 hours and are single-use. `target_status` keeps
-- the access level the Admin chose when the invitation was sent.
-- ---------------------------------------------------------------------
CREATE TABLE account_activation_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    target_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    requested_ip VARCHAR(45) NOT NULL DEFAULT '',
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_activation_token (token_hash),
    KEY idx_activation_employee (employee_id, used_at),
    KEY idx_activation_expiry (expires_at),
    CONSTRAINT fk_activation_employee
        FOREIGN KEY (employee_id) REFERENCES employees (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_email_verifications (
    employee_id INT UNSIGNED NOT NULL,
    pending_email VARCHAR(190) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_sent_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id),
    UNIQUE KEY uq_staff_email_verifications_email (pending_email),
    CONSTRAINT fk_staff_email_verifications_employee
        FOREIGN KEY (employee_id) REFERENCES employees (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_recovery_codes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    code_hash VARCHAR(255) NOT NULL,
    created_ip VARCHAR(45) NOT NULL DEFAULT '',
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_recovery_admin (admin_id, used_at),
    CONSTRAINT fk_recovery_admin
        FOREIGN KEY (admin_id) REFERENCES admin (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_hash CHAR(64) NOT NULL,
    user_type ENUM('admin', 'employee') NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    session_version INT UNSIGNED NOT NULL DEFAULT 1,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT '',
    last_seen_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_session_hash (session_hash),
    KEY idx_auth_session_user (user_type, user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_remember_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    selector CHAR(24) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    user_type ENUM('admin', 'employee') NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    session_version INT UNSIGNED NOT NULL DEFAULT 1,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT '',
    expires_at DATETIME NOT NULL,
    last_used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_remember_selector (selector),
    KEY idx_remember_user (user_type, user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
