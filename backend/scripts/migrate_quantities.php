<?php
/**
 * Widen kilogram quantity columns from two to three decimal places.
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_quantities.php
 *
 * Additive and safe to re-run. No row is inserted, deleted or rewritten: only
 * the column scale changes, so existing values are preserved exactly
 * (12.20 becomes 12.200).
 *
 * Money columns are deliberately left at DECIMAL(12,2).
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration script can only be run from the command line.\n");
}

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

$targets = [
    'inventory' => ['quantity'],
    'inventory_history' => ['quantity', 'previous_stock', 'next_stock'],
    'sale_items' => ['quantity'],
    'stock_in' => ['quantity', 'previous_stock', 'new_stock'],
    'stock_out' => ['quantity', 'previous_stock', 'new_stock'],
];

$changed = 0;

foreach ($targets as $table => $columns) {
    foreach ($columns as $column) {
        $row = Database::fetchOne(
            'SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$table, $column],
        );

        if (!$row) {
            echo "[skip] {$table}.{$column} does not exist.\n";
            continue;
        }

        $scale = (int) ($row['NUMERIC_SCALE'] ?? 0);
        if ($scale >= 3) {
            echo "[skip] {$table}.{$column} already has {$scale} decimal places.\n";
            continue;
        }

        Database::execute(
            "ALTER TABLE `{$table}` MODIFY `{$column}` DECIMAL(12,3) NOT NULL DEFAULT 0.000",
        );
        echo "[ok]   {$table}.{$column}: DECIMAL(12,{$scale}) -> DECIMAL(12,3)\n";
        $changed++;
    }
}

echo $changed === 0
    ? "Quantity precision is already up to date.\n"
    : "Updated {$changed} column(s). Existing values preserved.\n";
