<?php
/**
 * Secure local overrides for Guinhawa.
 *
 * Copy this file to a location OUTSIDE the public web root, for example:
 *
 *   C:/xampp/guinhawa-config/config.local.php
 *
 * The copy is loaded automatically by backend/config/config.php. Never place
 * the real mailbox password inside htdocs.
 *
 * The same mailbox sends password-reset codes (OTP) and staff activation
 * links for Admin, Inventory Staff and Cashier accounts.
 */

declare(strict_types=1);

return [
    // Gmail SMTP for account-ready notifications and password-reset codes.
    'mail' => [
        'driver' => 'smtp',
        'host' => 'smtp.gmail.com',
        'port' => 587,
        'username' => 'guinhawa.agri@gmail.com',
        // 16-character Google App Password with the spaces removed.
        // Google Account -> Security -> 2-Step Verification -> App passwords.
        // Never use the normal mailbox password and never commit this value.
        'password' => 'your-16-char-app-password',
        'encryption' => 'tls', // tls (STARTTLS on 587) or ssl (465)
        'from_email' => 'guinhawa.agri@gmail.com',
        'from_name' => 'Guinhawa Agri-Poultry Supply',
        'timeout' => 15,
    ],

    // Absolute address used inside emailed links. Use the address
    // staff actually open in their browser.
    'app' => [
        'url' => 'http://localhost/guinhawa_system',
    ],

    // Optional database overrides.
    // 'db' => [
    //     'host' => '127.0.0.1',
    //     'port' => 3306,
    //     'name' => 'guinhawa_db',
    //     'user' => 'root',
    //     'password' => '',
    // ],

    // Set to true when the site is served over HTTPS.
    // 'session' => ['secure' => '1'],
];
