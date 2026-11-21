<?php
/**
 * Add the authentication, password-recovery and account-security fields used
 * by the Guinhawa login, first-time setup and User Management pages.
 *
 * Run once from the command line:
 *
 *   C:\xampp\php\php.exe backend\scripts\migrate_auth.php
 *
 * The migration is additive and safe to re-run. It never drops a table,
 * deletes a row or overwrites an existing column.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration script can only be run from the command line.\n");
}

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

function authColumnExists(string $table, string $column): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

function authTableExists(string $table): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [$table],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

$columnChanges = [
    ['admin', 'temp_password_expires_at', 'DATETIME NULL AFTER password_changed_at'],
    ['admin', 'session_version', 'INT UNSIGNED NOT NULL DEFAULT 1 AFTER temp_password_expires_at'],
    ['admin', 'failed_login_count', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER session_version'],
    ['admin', 'locked_until', 'DATETIME NULL AFTER failed_login_count'],
    ['employees', 'temp_password_expires_at', 'DATETIME NULL AFTER password_changed_at'],
    ['employees', 'session_version', 'INT UNSIGNED NOT NULL DEFAULT 1 AFTER temp_password_expires_at'],
    ['employees', 'failed_login_count', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER session_version'],
    ['employees', 'locked_until', 'DATETIME NULL AFTER failed_login_count'],
];

$tables = [
    'password_reset_requests' => <<<'SQL'
CREATE TABLE IF NOT EXISTS password_reset_requests (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    'admin_recovery_codes' => <<<'SQL'
CREATE TABLE IF NOT EXISTS admin_recovery_codes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    'auth_remember_tokens' => <<<'SQL'
CREATE TABLE IF NOT EXISTS auth_remember_tokens (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    'auth_sessions' => <<<'SQL'
CREATE TABLE IF NOT EXISTS auth_sessions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
];

try {
    $applied = 0;

    foreach ($columnChanges as [$table, $column, $definition]) {
        if (!authTableExists($table)) {
            echo "[skip] {$table} does not exist.\n";
            continue;
        }
        if (authColumnExists($table, $column)) {
            echo "[skip] {$table}.{$column} already exists.\n";
            continue;
        }

        Database::execute("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
        echo "[add]  {$table}.{$column}\n";
        $applied++;
    }

    foreach ($tables as $table => $sql) {
        if (authTableExists($table)) {
            echo "[skip] {$table} already exists.\n";
            continue;
        }

        Database::execute($sql);
        echo "[add]  {$table}\n";
        $applied++;
    }

    echo $applied === 0
        ? "\nAuthentication schema is up to date.\n"
        : "\nAuthentication migration complete ({$applied} change(s) applied).\n";
} catch (Throwable $error) {
    fwrite(STDERR, "\nMigration failed: " . $error->getMessage() . "\n");
    exit(1);
}
