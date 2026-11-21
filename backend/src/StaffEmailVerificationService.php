<?php

declare(strict_types=1);

namespace Guinhawa;

use PDOException;

/** Staff-owned Gmail updates, verified with a short-lived one-time code. */
final class StaffEmailVerificationService
{
    private const CODE_TTL_MINUTES = 10;
    private const RESEND_COOLDOWN_SECONDS = 60;
    private const MAX_ATTEMPTS = 5;

    public static function status(array $user): array
    {
        self::assertEmployee($user);
        $employee = Database::fetchOne(
            'SELECT email, email_verified FROM employees WHERE id = ? AND deleted_at IS NULL LIMIT 1',
            [(int) $user['id']],
        );
        if (!$employee) {
            throw new HttpException('That staff account is unavailable.', 404, 'NOT_FOUND');
        }

        $pending = Database::fetchOne(
            'SELECT pending_email, expires_at, last_sent_at
             FROM staff_email_verifications WHERE employee_id = ? LIMIT 1',
            [(int) $user['id']],
        );

        return [
            'email' => (string) ($employee['email'] ?? ''),
            'verified' => (bool) ($employee['email_verified'] ?? false),
            'pendingEmail' => (string) ($pending['pending_email'] ?? ''),
            'expiresAt' => $pending['expires_at'] ?? null,
            'resendAvailableAt' => $pending
                ? date('Y-m-d H:i:s', strtotime((string) $pending['last_sent_at']) + self::RESEND_COOLDOWN_SECONDS)
                : null,
        ];
    }

    public static function requestCode(array $user, mixed $rawEmail): array
    {
        self::assertEmployee($user);
        $employeeId = (int) $user['id'];
        $email = Validator::gmail($rawEmail, true);
        $employee = Database::fetchOne(
            'SELECT * FROM employees WHERE id = ? AND deleted_at IS NULL LIMIT 1',
            [$employeeId],
        );
        if (!$employee) {
            throw new HttpException('That staff account is unavailable.', 404, 'NOT_FOUND');
        }

        if (strcasecmp((string) ($employee['email'] ?? ''), $email) === 0 && !empty($employee['email_verified'])) {
            return ['alreadyVerified' => true, 'verification' => self::status($user)];
        }

        AccountService::assertIdentityAvailable((string) $employee['username'], $email, $employeeId);
        $pendingDuplicate = Database::fetchOne(
            'SELECT employee_id FROM staff_email_verifications
             WHERE pending_email = ? AND employee_id <> ? LIMIT 1',
            [$email, $employeeId],
        );
        if ($pendingDuplicate) {
            throw new HttpException('That Gmail address is already being verified for another staff account.', 409, 'CONFLICT');
        }

        $existing = Database::fetchOne(
            'SELECT last_sent_at FROM staff_email_verifications WHERE employee_id = ? LIMIT 1',
            [$employeeId],
        );
        if ($existing) {
            $wait = self::RESEND_COOLDOWN_SECONDS - (time() - (int) strtotime((string) $existing['last_sent_at']));
            if ($wait > 0) {
                throw new HttpException('Wait ' . $wait . ' seconds before requesting another verification code.', 429, 'RATE_LIMITED');
            }
        }

        $code = (string) random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + self::CODE_TTL_MINUTES * 60);
        $codeHash = password_hash($code, PASSWORD_DEFAULT);

        try {
            Database::execute(
                'INSERT INTO staff_email_verifications
                    (employee_id, pending_email, otp_hash, expires_at, attempts, last_sent_at)
                 VALUES (?, ?, ?, ?, 0, NOW())
                 ON DUPLICATE KEY UPDATE
                    pending_email = VALUES(pending_email), otp_hash = VALUES(otp_hash),
                    expires_at = VALUES(expires_at), attempts = 0, last_sent_at = NOW()',
                [$employeeId, $email, $codeHash, $expiresAt],
            );
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                throw new HttpException('That Gmail address is already being verified for another staff account.', 409, 'CONFLICT');
            }
            throw $error;
        }

        try {
            Mailer::send(
                $email,
                'Verify your Guinhawa staff email',
                self::emailHtml($code),
                self::emailText($code),
            );
        } catch (\Throwable $error) {
            Database::execute(
                'DELETE FROM staff_email_verifications WHERE employee_id = ? AND otp_hash = ?',
                [$employeeId, $codeHash],
            );
            error_log('[guinhawa] Staff Gmail verification email could not be sent: ' . $error->getMessage());
            throw new HttpException('The verification email could not be sent. Check the Gmail delivery settings and try again.', 503, 'MAIL_UNAVAILABLE');
        }

        Auth::audit(
            $user,
            'Staff Gmail Verification Requested',
            'A Gmail verification code was sent to ' . $email . '.',
            (string) $employee['employee_id'],
        );

        return [
            'alreadyVerified' => false,
            'message' => 'A verification code was sent to ' . $email . '. It expires in 10 minutes.',
            'verification' => self::status($user),
        ];
    }

    public static function verifyCode(array $user, mixed $rawCode): array
    {
        self::assertEmployee($user);
        $employeeId = (int) $user['id'];
        $code = trim((string) ($rawCode ?? ''));
        if (!preg_match('/^\d{6}$/', $code)) {
            throw new HttpException('Enter the 6-digit verification code.', 422, 'VALIDATION');
        }

        $pending = Database::fetchOne(
            'SELECT * FROM staff_email_verifications WHERE employee_id = ? LIMIT 1',
            [$employeeId],
        );
        if (!$pending) {
            throw new HttpException('Request a new Gmail verification code first.', 422, 'VERIFICATION_MISSING');
        }
        if (strtotime((string) $pending['expires_at']) < time()) {
            Database::execute('DELETE FROM staff_email_verifications WHERE employee_id = ?', [$employeeId]);
            throw new HttpException('That verification code expired. Request a new one.', 422, 'VERIFICATION_EXPIRED');
        }
        if ((int) $pending['attempts'] >= self::MAX_ATTEMPTS) {
            Database::execute('DELETE FROM staff_email_verifications WHERE employee_id = ?', [$employeeId]);
            throw new HttpException('Too many incorrect attempts. Request a new verification code.', 429, 'RATE_LIMITED');
        }
        if (!password_verify($code, (string) $pending['otp_hash'])) {
            $attempts = (int) $pending['attempts'] + 1;
            if ($attempts >= self::MAX_ATTEMPTS) {
                Database::execute('DELETE FROM staff_email_verifications WHERE employee_id = ?', [$employeeId]);
                throw new HttpException('Too many incorrect attempts. Request a new verification code.', 429, 'RATE_LIMITED');
            }
            Database::execute('UPDATE staff_email_verifications SET attempts = ? WHERE employee_id = ?', [$attempts, $employeeId]);
            throw new HttpException('That code is incorrect. ' . (self::MAX_ATTEMPTS - $attempts) . ' attempt(s) remain.', 422, 'INVALID_CODE');
        }

        $email = (string) $pending['pending_email'];
        $employee = Database::fetchOne('SELECT * FROM employees WHERE id = ? AND deleted_at IS NULL LIMIT 1', [$employeeId]);
        if (!$employee) {
            Database::execute('DELETE FROM staff_email_verifications WHERE employee_id = ?', [$employeeId]);
            throw new HttpException('That staff account is unavailable.', 404, 'NOT_FOUND');
        }

        try {
            Database::transaction(static function () use ($employeeId, $email, $pending): void {
                $consumed = Database::execute(
                    'DELETE FROM staff_email_verifications
                     WHERE employee_id = ? AND otp_hash = ? AND expires_at > NOW() AND attempts < ?',
                    [$employeeId, (string) $pending['otp_hash'], self::MAX_ATTEMPTS],
                );
                if ($consumed !== 1) {
                    throw new HttpException('That verification code has expired or was already used. Request a new one.', 422, 'VERIFICATION_EXPIRED');
                }

                $duplicate = Database::fetchOne(
                    'SELECT id FROM admin WHERE email = ? LIMIT 1',
                    [$email],
                );
                if (!$duplicate) {
                    $duplicate = Database::fetchOne(
                        'SELECT id FROM employees WHERE email = ? AND id <> ? LIMIT 1',
                        [$email, $employeeId],
                    );
                }
                if ($duplicate) {
                    throw new HttpException('That Gmail address is already in use.', 409, 'CONFLICT');
                }
                Database::execute(
                    "UPDATE password_reset_requests SET consumed_at = NOW()
                     WHERE user_type = 'employee' AND user_id = ? AND channel = 'email'
                       AND consumed_at IS NULL AND reset_completed_at IS NULL",
                    [$employeeId],
                );
                Database::execute(
                    'UPDATE employees SET email = ?, email_verified = 1 WHERE id = ?',
                    [$email, $employeeId],
                );
            });
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                throw new HttpException('That Gmail address is already in use.', 409, 'CONFLICT');
            }
            throw $error;
        }

        $fresh = Database::fetchOne('SELECT * FROM employees WHERE id = ? LIMIT 1', [$employeeId]);
        $mapped = Users::mapEmployee($fresh);
        Auth::audit(
            $mapped,
            'Staff Gmail Verified',
            $mapped['fullName'] . ' verified the Gmail address ' . $email . '.',
            (string) $mapped['employeeId'],
        );

        return ['user' => $mapped, 'verification' => self::status($mapped)];
    }

    private static function assertEmployee(array $user): void
    {
        if (($user['type'] ?? '') !== 'employee') {
            throw new HttpException('Gmail verification is available for staff accounts only.', 403, 'FORBIDDEN');
        }
    }

    private static function emailHtml(string $code): string
    {
        $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
        return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#10271b">'
            . '<h1 style="font-size:20px;margin:0 0 12px">Verify your Gmail address</h1>'
            . '<p>Enter this code in your Guinhawa staff profile to confirm the address:</p>'
            . '<p style="font-size:28px;font-weight:bold;letter-spacing:8px">' . $safeCode . '</p>'
            . '<p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>'
            . '</div>';
    }

    private static function emailText(string $code): string
    {
        return "Verify your Gmail address\n\n"
            . "Enter this code in your Guinhawa staff profile: {$code}\n\n"
            . "This code expires in 10 minutes. If you did not request it, you can ignore this email.\n";
    }
}
