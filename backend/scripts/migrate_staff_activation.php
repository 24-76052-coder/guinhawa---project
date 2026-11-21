<?php
/**
 * Staff account activation + email OTP support.
 *
 * Run once from the command line (safe to re-run):
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_staff_activation.php
 *
 * Changes:
 *   - employees.status gains a `pending` (Pending Activation) value
 *   - employees.date_joined DATE (backfilled from created_at)
 *   - account_activation_tokens table for single-use 24-hour activation links
 *
 * The migration is additive: no table, row or existing column is dropped or
 * overwritten.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration script can only be run from the command line.\n");
}

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

function activationColumnExists(string $table, string $column): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

function activationTableExists(string $table): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [$table],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

function activationColumnType(string $table, string $column): string
{
    $row = Database::fetchOne(
        'SELECT COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );

    return (string) ($row['COLUMN_TYPE'] ?? '');
}

echo "Guinhawa staff activation migration\n";
echo "-----------------------------------\n";

// 1. Pending Activation status.
$statusType = activationColumnType('employees', 'status');
if (!str_contains($statusType, "'pending'")) {
    Database::execute(
        "ALTER TABLE employees
         MODIFY COLUMN status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active'",
    );
    echo "[ok] employees.status now accepts Pending Activation\n";
} else {
    echo "[skip] employees.status already supports pending\n";
}

// 2. Date joined. (Work shifts were removed; every employee follows the
// fixed 8:00 AM - 5:00 PM schedule.)
if (!activationColumnExists('employees', 'date_joined')) {
    Database::execute('ALTER TABLE employees ADD COLUMN date_joined DATE NULL AFTER role');
    echo "[ok] added employees.date_joined\n";
} else {
    echo "[skip] employees.date_joined already exists\n";
}

$backfill = Database::execute(
    'UPDATE employees SET date_joined = DATE(created_at) WHERE date_joined IS NULL AND created_at IS NOT NULL',
);
echo "[ok] backfilled date_joined for {$backfill} existing account(s)\n";

// 3. Single-use activation tokens.
if (!activationTableExists('account_activation_tokens')) {
    Database::execute(
        <<<'SQL'
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
    CONSTRAINT fk_activation_employee FOREIGN KEY (employee_id)
        REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    );
    echo "[ok] created account_activation_tokens\n";
} else {
    echo "[skip] account_activation_tokens already exists\n";
}

echo "Done. Existing accounts and records were not changed.\n";
