<?php
/**
 * Staff account archive (soft delete).
 *
 * Run once from the command line (safe to re-run):
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_staff_archive.php
 *
 * Changes:
 *   - employees.deleted_at DATETIME NULL   when the record was archived
 *   - employees.deleted_by VARCHAR(160)    which Admin archived it
 *   - index on deleted_at for directory queries
 *
 * Deleting a staff account never removes the row: sales, attendance, audit
 * logs and the saved personal details stay intact. The row is hidden from
 * the team directory until an Admin restores it.
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

function archiveColumnExists(string $table, string $column): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [$table, $column],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

function archiveIndexExists(string $table, string $index): bool
{
    $row = Database::fetchOne(
        'SELECT COUNT(*) AS total
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [$table, $index],
    );

    return (int) ($row['total'] ?? 0) > 0;
}

echo "Guinhawa staff archive migration\n";
echo "--------------------------------\n";

if (!archiveColumnExists('employees', 'deleted_at')) {
    Database::execute('ALTER TABLE employees ADD COLUMN deleted_at DATETIME NULL AFTER locked_until');
    echo "[ok] employees.deleted_at added\n";
} else {
    echo "[skip] employees.deleted_at already exists\n";
}

if (!archiveColumnExists('employees', 'deleted_by')) {
    Database::execute('ALTER TABLE employees ADD COLUMN deleted_by VARCHAR(160) NULL AFTER deleted_at');
    echo "[ok] employees.deleted_by added\n";
} else {
    echo "[skip] employees.deleted_by already exists\n";
}

if (!archiveIndexExists('employees', 'idx_employees_deleted')) {
    Database::execute('ALTER TABLE employees ADD KEY idx_employees_deleted (deleted_at)');
    echo "[ok] idx_employees_deleted added\n";
} else {
    echo "[skip] idx_employees_deleted already exists\n";
}

echo "\nDone. Deleted staff stay in `employees` as read-only archived records.\n";
