<?php
declare(strict_types=1);

/**
 * The old two-step reset page has been replaced by the email OTP wizard at
 * login/forgot-password.php. Keep this file so bookmarks and old emails do
 * not break, and forward visitors to the current flow.
 */

require __DIR__ . '/../backend/bootstrap.php';

\Guinhawa\Web::go('/guinhawa_system/login/forgot-password.php');
