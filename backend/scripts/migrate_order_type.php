<?php
/**
 * Add the POS "customer order type" field to an existing database.
 *
 * Fresh installations already get the column from backend/schema.sql. Run this
 * once after pulling the online-order update into an older installation:
 *
 *   C:\xampp2\php\php.exe backend/scripts/migrate_order_type.php
 *
 * Safe to run more than once: a column is only added when it is missing.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration script can only be run from the command line.\n");
}

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

/** @return bool */
function columnExists(string $table, string $column): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

$definition = "ENUM('Walk-in', 'Online') NOT NULL DEFAULT 'Walk-in'";
$changes = [
    ['sales', 'order_type', $definition . ' AFTER customer_id'],
    ['held_orders', 'order_type', $definition . ' AFTER payment_method'],
];

try {
    $applied = 0;
    foreach ($changes as [$table, $column, $sql]) {
        if (columnExists($table, $column)) {
            echo "[skip] {$table}.{$column} already exists.\n";
            continue;
        }

        Database::execute("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$sql}");
        echo "[add]  {$table}.{$column}\n";
        $applied++;
    }

    echo $applied === 0
        ? "\nOrder type fields are up to date.\n"
        : "\nOrder type migration complete ({$applied} column(s) added).\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Migration failed: {$error->getMessage()}\n");
    exit(1);
}
