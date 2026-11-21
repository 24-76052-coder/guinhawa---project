<?php
/**
 * Additive migration for the plain-HTML dashboard (guinhawa_system).
 *
 * The HTML design stores a unit cost per product, a store owner, a receipt
 * footer, and an explicit attendance status (Present, Late, On Leave, Absent).
 * These columns are added without touching any existing row; all new columns
 * default to zero or an empty string.
 *
 * `attendance.clock_in` becomes nullable so a leave or absence row can exist
 * without inventing a fake clock-in time. Existing values are preserved.
 *
 * Safe to run repeatedly:
 *   C:\xampp2\php\php.exe backend/scripts/migrate_design_port.php
 */

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

function columnExists(string $table, string $column): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );
    return (int) ($row['total'] ?? 0) > 0;
}

$changes = [];

if (!columnExists('products', 'cost')) {
    Database::execute('ALTER TABLE products ADD COLUMN cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER minimum');
    $changes[] = 'products.cost added';
}

if (!columnExists('settings', 'owner')) {
    Database::execute("ALTER TABLE settings ADD COLUMN owner VARCHAR(160) NOT NULL DEFAULT '' AFTER store_name");
    $changes[] = 'settings.owner added';
}

if (!columnExists('settings', 'receipt_footer')) {
    Database::execute("ALTER TABLE settings ADD COLUMN receipt_footer VARCHAR(255) NOT NULL DEFAULT '' AFTER description");
    $changes[] = 'settings.receipt_footer added';
}

if (!columnExists('attendance', 'status')) {
    Database::execute("ALTER TABLE attendance ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT '' AFTER hours");
    $changes[] = 'attendance.status added';
}

if (!columnExists('attendance', 'note')) {
    Database::execute("ALTER TABLE attendance ADD COLUMN note VARCHAR(255) NOT NULL DEFAULT '' AFTER status");
    $changes[] = 'attendance.note added';
}

$clockIn = Database::fetchOne(
    'SELECT IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['attendance', 'clock_in'],
);
if (($clockIn['IS_NULLABLE'] ?? 'NO') !== 'YES') {
    Database::execute('ALTER TABLE attendance MODIFY COLUMN clock_in TIME NULL DEFAULT NULL');
    $changes[] = 'attendance.clock_in is now nullable';
}

echo $changes ? implode(PHP_EOL, $changes) . PHP_EOL : "Nothing to do; all columns already exist.\n";
