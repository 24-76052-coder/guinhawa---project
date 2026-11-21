<?php
/**
 * Add the per-product sack weight used by POS sack sales.
 *
 * Fresh installations already get this column from backend/schema.sql. Run
 * this once after pulling the quantity-selection update into an older
 * installation:
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_sack_weight.php
 *
 * Existing products start at 0 (not configured) because the store must enter
 * the real kg-per-sack value for each product in Products > Edit. The script
 * is safe to run more than once.
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

try {
    if (columnExists('products', 'sack_weight_kg')) {
        echo "[skip] products.sack_weight_kg already exists.\n";
    } else {
        Database::execute(
            'ALTER TABLE products
             ADD COLUMN sack_weight_kg DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER minimum',
        );
        echo "[add]  products.sack_weight_kg\n";
    }

    echo "\nSack weight migration complete. Set each product's kg-per-sack in Products > Edit.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Migration failed: {$error->getMessage()}\n");
    exit(1);
}
