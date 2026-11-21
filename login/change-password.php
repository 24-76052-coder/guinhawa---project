<?php
declare(strict_types=1);

require __DIR__ . '/../backend/bootstrap.php';

\Guinhawa\Web::boot($config);
header_remove('Content-Security-Policy');

if (!\Guinhawa\Auth::user()) {
    \Guinhawa\Web::go('/guinhawa_system/login/index.php?expired=1');
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Change password · Guinhawa Poultry Supply</title>
  <link rel="icon" type="image/png" href="/guinhawa_system/assets/images/guinhawa-logo.png">
  <style>
    :root {
      --gq-green: #166534;
      --gq-green-dark: #14532d;
      --gq-green-soft: #ecfdf3;
      --gq-ink: #1f2933;
      --gq-muted: #61707d;
      --gq-line: #dbe4dc;
      --gq-danger: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: radial-gradient(circle at 20% 10%, #e8f7ee 0, #f7fbf8 45%, #eef5f0 100%);
      font-family: "DM Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
      color: var(--gq-ink);
    }
    .card {
      width: min(460px, 100%);
      background: #fff;
      border: 1px solid var(--gq-line);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 24px 60px -30px rgba(22, 101, 52, .45);
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
    .brand img { width: 46px; height: 46px; object-fit: contain; }
    .brand strong { display: block; font-size: 15px; letter-spacing: .02em; }
    .brand span { font-size: 12px; color: var(--gq-muted); }
    h1 { margin: 0 0 6px; font-size: 23px; }
    .sub { margin: 0 0 20px; color: var(--gq-muted); font-size: 14px; line-height: 1.55; }
    .notice {
      margin: 0 0 18px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--gq-green-soft);
      border: 1px solid #bbe7cb;
      color: var(--gq-green-dark);
      font-size: 13px;
      line-height: 1.5;
    }
    label { display: block; font-size: 13px; font-weight: 600; margin: 0 0 6px; }
    .field { margin-bottom: 16px; }
    input {
      width: 100%;
      padding: 12px 13px;
      border: 1px solid var(--gq-line);
      border-radius: 10px;
      font: inherit;
      font-size: 14px;
      background: #fbfdfb;
    }
    input:focus { outline: 2px solid #a7d7b8; border-color: var(--gq-green); background: #fff; }
    .hint { margin: 6px 0 0; font-size: 12px; color: var(--gq-muted); }
    button {
      width: 100%;
      margin-top: 6px;
      padding: 13px 16px;
      border: 0;
      border-radius: 10px;
      background: var(--gq-green);
      color: #fff;
      font: inherit;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: var(--gq-green-dark); }
    button:disabled { opacity: .65; cursor: progress; }
    .status { min-height: 20px; margin: 14px 0 0; font-size: 13px; color: var(--gq-muted); }
    .status.error { color: var(--gq-danger); }
    .status.success { color: var(--gq-green); }
  </style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <img src="/guinhawa_system/assets/images/guinhawa-logo.png" alt="">
      <div>
        <strong>Guinhawa Poultry Supply</strong>
        <span>Management System</span>
      </div>
    </div>

    <h1>Change password</h1>
    <p class="sub">Replace your temporary password with one only you know. Use at least 8 characters with uppercase, lowercase and a number.</p>

    <p class="notice" id="requiredNotice" hidden>
      Your account was created with a temporary password. Choose a new password to continue to the dashboard.
    </p>

    <form id="passwordForm" novalidate>
      <div class="field">
        <label for="currentPassword">Current password</label>
        <input id="currentPassword" type="password" autocomplete="current-password" required>
      </div>
      <div class="field">
        <label for="newPassword">New password</label>
        <input id="newPassword" type="password" autocomplete="new-password" required>
        <p class="hint">At least 8 characters, with uppercase, lowercase and a number.</p>
      </div>
      <div class="field">
        <label for="confirmPassword">Confirm new password</label>
        <input id="confirmPassword" type="password" autocomplete="new-password" required>
      </div>
      <button id="submitButton" type="submit">Save new password</button>
      <p class="status" id="status" role="status" aria-live="polite"></p>
    </form>
  </main>

  <script src="js/change-password.js" defer></script>
</body>
</html>
