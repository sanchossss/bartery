<?php

require_once __DIR__ . '/../helpers.php';

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$limit = min(50, max(1, getInt($_GET ?? [], 'limit', 20)));

try {
    $totalStmt = $db->query('SELECT COUNT(*) AS c FROM users WHERE is_active = 1');
    $totalUsers = (int) $totalStmt->fetch()['c'];

    $stmt = $db->query('
        SELECT id, username, full_name, avatar_url, points
        FROM users
        WHERE is_active = 1
        ORDER BY points DESC, id ASC
        LIMIT ' . (int) $limit
    );
    $users = $stmt->fetchAll();

    jsonResponse(['users' => $users, 'total_users' => $totalUsers]);
} catch (Exception $e) {
    logApiError('Error fetching leaderboard', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
    jsonResponse(['error' => 'Failed to fetch leaderboard'], 500);
}
