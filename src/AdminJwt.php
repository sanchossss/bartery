<?php

/**
 * Minimal HS256 JWT for admin panel (no external deps).
 */
final class AdminJwt
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $pad = strlen($data) % 4;
        if ($pad) {
            $data .= str_repeat('=', 4 - $pad);
        }
        return base64_decode(strtr($data, '-_', '+/'), true) ?: '';
    }

    public static function secret(): string
    {
        $s = getenv('ADMIN_JWT_SECRET') ?: '';
        if (strlen($s) < 16) {
            throw new RuntimeException('ADMIN_JWT_SECRET must be set and at least 16 characters');
        }
        return $s;
    }

    public static function issue(int $ttlSeconds = 28800): string
    {
        $header = self::base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'], JSON_THROW_ON_ERROR));
        $payload = self::base64UrlEncode(json_encode([
            'sub' => 'admin',
            'iat' => time(),
            'exp' => time() + $ttlSeconds,
        ], JSON_THROW_ON_ERROR));
        $sig = self::base64UrlEncode(hash_hmac('sha256', $header . '.' . $payload, self::secret(), true));
        return $header . '.' . $payload . '.' . $sig;
    }

    /** @return array{sub: string, iat: int, exp: int}|null */
    public static function verify(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $sig] = $parts;
        $expected = self::base64UrlEncode(hash_hmac('sha256', $h . '.' . $p, self::secret(), true));
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        $json = self::base64UrlDecode($p);
        $data = json_decode($json, true);
        if (!is_array($data) || ($data['sub'] ?? '') !== 'admin') {
            return null;
        }
        $exp = (int)($data['exp'] ?? 0);
        if ($exp < time()) {
            return null;
        }
        return $data;
    }
}
