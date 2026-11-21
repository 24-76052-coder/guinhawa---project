<?php
/**
 * Add the profile fields used by Settings > Profile to an existing database.
 *
 * Fresh installations already get these columns from backend/schema.sql. Run
 * this once after pulling the profile update into an older installation:
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_profile.php
 *
 * The script is safe to run more than once: it only adds a column when the
 * column is missing.
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

$changes = [
    ['admin', 'email', 'VARCHAR(190) NULL AFTER full_name'],
    ['admin', 'contact_number', 'VARCHAR(40) NULL AFTER email'],
    ['admin', 'avatar', 'MEDIUMTEXT NULL AFTER contact_number'],
    ['employees', 'avatar', 'MEDIUMTEXT NULL AFTER contact_number'],
];

try {
    $applied = 0;
    foreach ($changes as [$table, $column, $definition]) {
        if (columnExists($table, $column)) {
            echo "[skip] {$table}.{$column} already exists.\n";
            continue;
        }

        Database::execute("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
        echo "[add]  {$table}.{$column}\n";
        $applied++;
    }

    echo $applied === 0
        ? "\nProfile fields are up to date.\n"
        : "\nProfile migration complete ({$applied} column(s) added).\n";
} catch (Throwable $error) {
    fwrite(STDERR, "\nMigration failed: " . $error->getMessage() . "\n");
    exit(1);
}
