<?php
/**
 * Remove the per-employee work shift column.
 *
 * Every Guinhawa employee follows the same fixed schedule, 8:00 AM - 5:00 PM,
 * so shift selection is no longer stored or shown. This migration drops the
 * legacy `employees.work_shift` column if it still exists.
 *
 * Run once from the command line (safe to re-run):
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_fixed_schedule.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration script can only be run from the command line.\n");
}

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

function fixedScheduleColumnExists(string $table, string $column): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

echo "Guinhawa fixed work schedule migration\n";
echo "--------------------------------------\n";

if (fixedScheduleColumnExists('employees', 'work_shift')) {
    Database::execute('ALTER TABLE employees DROP COLUMN work_shift');
    echo "[ok] dropped employees.work_shift; all staff now use 8:00 AM - 5:00 PM\n";
} else {
    echo "[skip] employees.work_shift already removed\n";
}
