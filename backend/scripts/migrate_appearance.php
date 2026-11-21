<?php
/**
 * Add the JSON preferences column used by the expanded Appearance settings.
 *
 * The original table only had one column per option, which cannot hold theme
 * presets, custom colours, or the newer interface options. The JSON column
 * stores the whole preference object while the original columns stay in place
 * so older rows keep working.
 *
 *   C:\xampp2\php\php.exe backend\scripts\migrate_appearance.php
 *
 * Safe to run more than once: it only adds the column when it is missing.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration script can only be run from the command line.\n");
}

require __DIR__ . '/../bootstrap.php';

use Guinhawa\Database;

/** @return bool */
function appearanceColumnExists(string $table, string $column): bool
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
    if (appearanceColumnExists('user_appearance_settings', 'preferences')) {
        echo "[skip] user_appearance_settings.preferences already exists.\n";
    } else {
        Database::execute(
            'ALTER TABLE user_appearance_settings
             ADD COLUMN preferences JSON NULL AFTER reduce_animations',
        );
        echo "[add]  user_appearance_settings.preferences\n";
    }

    echo "\nAppearance preferences are up to date.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "\nMigration failed: " . $error->getMessage() . "\n");
    exit(1);
}
