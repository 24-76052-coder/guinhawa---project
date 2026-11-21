<?php
/**
 * Install PHPMailer into backend/vendor/PHPMailer.
 *
 * Run from the command line:
 *
 *   C:\xampp2\php\php.exe backend\scripts\install_phpmailer.php
 *
 * The Guinhawa mailer uses PHPMailer for Gmail SMTP. This helper downloads
 * the official release source archive, copies only the `src` directory (which
 * backend/.htaccess already blocks from the web) and removes the temporary
 * download. It is safe to re-run; existing files are replaced by the same
 * version.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This installer can only be run from the command line.\n");
}

const PHPMailerVersion = '7.2.0';

$root = dirname(__DIR__);
$vendorDir = $root . '/vendor/PHPMailer';
$sourceDir = $vendorDir . '/src';
$archiveUrl = 'https://github.com/PHPMailer/PHPMailer/archive/refs/tags/v' . PHPMailerVersion . '.zip';

echo "Guinhawa — PHPMailer installer\n";
echo "Version: " . PHPMailerVersion . "\n\n";

if (!class_exists('ZipArchive')) {
    fwrite(STDERR, "The PHP zip extension is required. Enable extension=zip in php.ini.\n");
    exit(1);
}

if (is_file($sourceDir . '/PHPMailer.php')) {
    $contents = (string) file_get_contents($sourceDir . '/PHPMailer.php');
    if (preg_match("/const VERSION = '([^']+)'/", $contents, $match) && $match[1] === PHPMailerVersion) {
        echo "PHPMailer " . PHPMailerVersion . " is already installed at:\n  {$sourceDir}\n";
        exit(0);
    }
}

$tempZip = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'phpmailer-' . PHPMailerVersion . '-' . bin2hex(random_bytes(4)) . '.zip';
$tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'phpmailer-' . PHPMailerVersion . '-' . bin2hex(random_bytes(4));

echo "Downloading {$archiveUrl}\n";
$download = @file_get_contents($archiveUrl, false, stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 60,
        'user_agent' => 'guinhawa-installer/' . PHPMailerVersion,
    ],
]));

if ($download === false || strlen($download) < 10000) {
    fwrite(STDERR, "Download failed. Check the network connection and try again.\n");
    exit(1);
}

if (file_put_contents($tempZip, $download) === false) {
    fwrite(STDERR, "Could not write the temporary archive.\n");
    exit(1);
}

$zip = new ZipArchive();
if ($zip->open($tempZip) !== true) {
    @unlink($tempZip);
    fwrite(STDERR, "The downloaded archive could not be opened.\n");
    exit(1);
}
$zip->extractTo($tempDir);
$zip->close();
@unlink($tempZip);

$extracted = $tempDir . '/PHPMailer-' . PHPMailerVersion;
if (!is_dir($extracted . '/src')) {
    fwrite(STDERR, "The archive did not contain the expected src directory.\n");
    exit(1);
}

if (!is_dir($sourceDir) && !mkdir($sourceDir, 0755, true) && !is_dir($sourceDir)) {
    fwrite(STDERR, "Could not create {$sourceDir}\n");
    exit(1);
}

$copied = 0;
foreach (scandir($extracted . '/src') ?: [] as $entry) {
    if ($entry === '.' || $entry === '..') {
        continue;
    }
    $from = $extracted . '/src/' . $entry;
    if (is_file($from)) {
        copy($from, $sourceDir . '/' . $entry);
        $copied++;
    }
}

if (is_file($extracted . '/LICENSE')) {
    copy($extracted . '/LICENSE', $vendorDir . '/LICENSE');
}

require_once $sourceDir . '/Exception.php';
require_once $sourceDir . '/PHPMailer.php';
require_once $sourceDir . '/SMTP.php';

if (!class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
    fwrite(STDERR, "PHPMailer files were copied but could not be loaded.\n");
    exit(1);
}

function removeDirectory(string $directory): void
{
    foreach (scandir($directory) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        $path = $directory . DIRECTORY_SEPARATOR . $entry;
        if (is_dir($path)) {
            removeDirectory($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($directory);
}

removeDirectory($tempDir);

echo "Installed {$copied} source file(s) into:\n  {$sourceDir}\n";
echo "PHPMailer is ready. Add Gmail SMTP credentials to the protected\n";
echo "config.local.php file, then send a test activation from User Management.\n";
