<?php

require_once __DIR__ . '/../helpers.php';

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$categoryId = getInt($_GET ?? [], 'category_id');
$limit = min(200, max(1, getInt($_GET ?? [], 'limit', 100)));

try {
    $sql = '
        SELECT
            us.user_id, us.skill_id, us.proficiency_level, us.description AS offer_description,
            u.username, u.full_name, u.avatar_url, u.bio,
            s.name AS skill_name, s.description AS skill_description, s.category_id, c.name AS category_name,
            (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE reviewed_id = u.id) AS teacher_avg_rating,
            (SELECT COUNT(*) FROM reviews WHERE reviewed_id = u.id) AS teacher_review_count
        FROM user_skills us
        INNER JOIN users u ON u.id = us.user_id AND u.is_active = 1
        INNER JOIN skills s ON s.id = us.skill_id
        LEFT JOIN categories c ON c.id = s.category_id
        WHERE us.type = "teach"
    ';
    $params = [];
    if ($categoryId) {
        $sql .= ' AND s.category_id = ?';
        $params[] = $categoryId;
    }
    $sql .= ' ORDER BY us.created_at DESC LIMIT ' . (int) $limit;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        if ($row['teacher_avg_rating'] !== null) {
            $row['teacher_avg_rating'] = (float) $row['teacher_avg_rating'];
        }
        $row['teacher_review_count'] = (int) $row['teacher_review_count'];
    }
    unset($row);
    jsonResponse(['offers' => $rows]);
} catch (Exception $e) {
    logApiError('Error fetching teach offers', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
    jsonResponse(['error' => 'Failed to fetch offers'], 500);
}
