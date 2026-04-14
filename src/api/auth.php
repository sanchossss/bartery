<?php

require_once __DIR__ . '/../helpers.php';

$action = $id ?? '';

if ($action === 'register' && $method === 'POST') {
    try {
        $data = getJsonBody();
        if (!$data || empty($data['username']) || empty($data['email']) || empty($data['password'])) {
            jsonResponse(['error' => 'username, email and password required'], 400);
        }
        $username = trim($data['username']);
        $email = trim($data['email']);
        $password = $data['password'];
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
        }
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $fullName = trim($data['full_name'] ?? '');
        $stmt = $db->prepare('INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)');
        $stmt->execute([$username, $email, $passwordHash, $fullName]);
        $userId = (int) $db->lastInsertId();
        $token = bin2hex(random_bytes(32));
        $db->prepare('UPDATE users SET api_token = ?, last_login = NOW() WHERE id = ?')->execute([$token, $userId]);
        $stmt = $db->prepare('SELECT id, username, email, full_name, bio, avatar_url, role, points FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        jsonResponse(['user' => $user, 'token' => $token], 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['error' => 'Username or email already exists'], 409);
        }
        logApiError('Auth registration error', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'username' => $username ?? null,
            'email' => $email ?? null,
        ]);
        jsonResponse(['error' => 'Registration failed'], 500);
    } catch (Exception $e) {
        logApiError('Auth registration error (non-DB)', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        jsonResponse(['error' => 'Registration failed'], 500);
    }
}

if ($action === 'login' && $method === 'POST') {
    try {
        $data = getJsonBody();
        if (!$data || empty($data['email']) || empty($data['password'])) {
            jsonResponse(['error' => 'email and password required'], 400);
        }
        $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE email = ? AND is_active = 1');
        $stmt->execute([trim($data['email'])]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['error' => 'Invalid credentials'], 401);
        }

        $inputPassword = (string) $data['password'];
        $stored = (string) ($row['password_hash'] ?? '');

        // Backward compatibility for users created/edited via admin table
        // where plain text could be stored in password_hash.
        $isValid = false;
        $needsUpgrade = false;

        if ($stored !== '' && password_verify($inputPassword, $stored)) {
            $isValid = true;
            $needsUpgrade = password_needs_rehash($stored, PASSWORD_DEFAULT);
        } elseif ($stored !== '' && hash_equals($stored, $inputPassword)) {
            $isValid = true;
            $needsUpgrade = true; // plaintext in DB -> replace with secure hash
        }

        if (!$isValid) {
            jsonResponse(['error' => 'Invalid credentials'], 401);
        }

        if ($needsUpgrade) {
            $newHash = password_hash($inputPassword, PASSWORD_DEFAULT);
            $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$newHash, $row['id']]);
        }

        $token = bin2hex(random_bytes(32));
        $db->prepare('UPDATE users SET api_token = ?, last_login = NOW() WHERE id = ?')->execute([$token, $row['id']]);
        $stmt = $db->prepare('SELECT id, username, email, full_name, bio, avatar_url, role, points FROM users WHERE id = ?');
        $stmt->execute([$row['id']]);
        $user = $stmt->fetch();
        jsonResponse(['user' => $user, 'token' => $token]);
    } catch (Exception $e) {
        logApiError('Auth login error', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'email' => $data['email'] ?? null,
        ]);
        jsonResponse(['error' => 'Login failed'], 500);
    }
}

if ($action === 'logout' && $method === 'POST') {
    try {
        $user = getAuthUser();
        if ($user) {
            $db->prepare('UPDATE users SET api_token = NULL WHERE id = ?')->execute([$user['id']]);
        }
        jsonResponse(['message' => 'Logged out']);
    } catch (Exception $e) {
        logApiError('Auth logout error', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        jsonResponse(['error' => 'Logout failed'], 500);
    }
}

jsonResponse(['error' => 'Not found'], 404);
