<?php

declare(strict_types=1);

require_once __DIR__ . '/../AdminJwt.php';

const ADMIN_ALLOWED_TABLES = [
    'users',
    'categories',
    'skills',
    'user_skills',
    'messages',
    'reviews',
    'video_calls',
    'badges',
    'user_badges',
    'user_push_tokens',
];

function adminBearerToken(): ?string
{
    $auth = getallheaders()['Authorization'] ?? getallheaders()['authorization'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) {
        return null;
    }
    return trim($m[1]);
}

function requireAdminJwt(): void
{
    $token = adminBearerToken();
    if (!$token) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    try {
        $payload = AdminJwt::verify($token);
        if (!$payload) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }
    } catch (Throwable $e) {
        jsonResponse(['error' => 'Server misconfiguration'], 500);
    }
}

function adminPasswordOk(string $plain): bool
{
    $expected = getenv('ADMIN_PASSWORD');
    if ($expected === false || $expected === '') {
        return false;
    }
    return hash_equals((string)$expected, $plain);
}

// POST /api/admin/login
if ($id === 'login' && $method === 'POST') {
    $body = getJsonBody();
    $password = is_array($body) ? (string)($body['password'] ?? '') : '';
    if ($password === '' || !adminPasswordOk($password)) {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }
    try {
        $token = AdminJwt::issue();
    } catch (Throwable $e) {
        jsonResponse(['error' => 'Admin auth not configured'], 500);
    }
    jsonResponse(['token' => $token, 'expires_in' => 28800]);
}

// GET /api/admin/me
if ($id === 'me' && $method === 'GET') {
    requireAdminJwt();
    jsonResponse(['admin' => true]);
}

// GET /api/admin/stats
if ($id === 'stats' && $method === 'GET') {
    requireAdminJwt();
    $db = Database::get();
    $stats = [];
    foreach (ADMIN_ALLOWED_TABLES as $t) {
        try {
            $c = (int)$db->query("SELECT COUNT(*) AS c FROM `$t`")->fetch()['c'];
            $stats[$t] = $c;
        } catch (Throwable $e) {
            $stats[$t] = null;
        }
    }
    jsonResponse(['stats' => $stats]);
}

// GET /api/admin/tables
if ($id === 'tables' && $method === 'GET') {
    requireAdminJwt();
    jsonResponse(['tables' => ADMIN_ALLOWED_TABLES]);
}

// GET /api/admin/rows?table=users&limit=50&offset=0
if ($id === 'rows' && $method === 'GET') {
    requireAdminJwt();
    $db = Database::get();
    $table = isset($_GET['table']) ? preg_replace('/[^a-z_0-9]/', '', $_GET['table']) : '';
    if (!in_array($table, ADMIN_ALLOWED_TABLES, true)) {
        jsonResponse(['error' => 'Invalid table'], 400);
    }
    $limit = min(200, max(1, (int)($_GET['limit'] ?? 50)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $cols = $db->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    $colNames = array_column($cols, 'Field');
    $pkCols = array_values(array_filter($cols, fn($c) => ($c['Key'] ?? '') === 'PRI'));
    $pkNames = array_column($pkCols, 'Field');

    $order = $pkNames ? '`' . preg_replace('/[^a-z_0-9]/', '', $pkNames[0]) . '`' : '1';
    $stmt = $db->prepare("SELECT COUNT(*) AS c FROM `$table`");
    $stmt->execute();
    $total = (int)$stmt->fetch()['c'];

    $stmt = $db->prepare("SELECT * FROM `$table` ORDER BY $order LIMIT ? OFFSET ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->bindValue(2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $columnMeta = [];
    foreach ($cols as $c) {
        $columnMeta[] = [
            'field' => $c['Field'],
            'type' => $c['Type'] ?? '',
            'nullable' => ($c['Null'] ?? '') === 'YES',
            'key' => $c['Key'] ?? '',
            'extra' => $c['Extra'] ?? '',
            'default' => $c['Default'] ?? null,
        ];
    }

    jsonResponse([
        'table' => $table,
        'columns' => $colNames,
        'column_meta' => $columnMeta,
        'primary_key' => $pkNames,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'rows' => $rows,
    ]);
}

// POST /api/admin/rows  body: { "table": "users", "row": { "username": "...", ... } }
if ($id === 'rows' && $method === 'POST') {
    requireAdminJwt();
    $db = Database::get();
    $body = getJsonBody();
    if (!is_array($body)) {
        jsonResponse(['error' => 'Invalid JSON'], 400);
    }
    $table = isset($body['table']) ? preg_replace('/[^a-z_0-9]/', '', (string)$body['table']) : '';
    if (!in_array($table, ADMIN_ALLOWED_TABLES, true)) {
        jsonResponse(['error' => 'Invalid table'], 400);
    }
    $row = $body['row'] ?? null;
    if (!is_array($row)) {
        jsonResponse(['error' => 'row object required'], 400);
    }

    $cols = $db->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    $byField = [];
    foreach ($cols as $cm) {
        $byField[$cm['Field']] = $cm;
    }

    $insertCols = [];
    $insertVals = [];
    foreach ($row as $key => $val) {
        $k = preg_replace('/[^a-z_0-9_]/', '', (string)$key);
        if ($k === '' || !isset($byField[$k])) {
            continue;
        }
        $extra = (string)($byField[$k]['Extra'] ?? '');
        if (stripos($extra, 'auto_increment') !== false && ($val === null || $val === '')) {
            continue;
        }
        $insertCols[] = '`' . $k . '`';
        $insertVals[] = $val;
    }
    if ($insertCols === []) {
        jsonResponse(['error' => 'No valid columns to insert'], 400);
    }

    $placeholders = implode(',', array_fill(0, count($insertCols), '?'));
    $sql = 'INSERT INTO `' . $table . '` (' . implode(',', $insertCols) . ') VALUES (' . $placeholders . ')';
    try {
        $stmt = $db->prepare($sql);
        foreach ($insertVals as $i => $val) {
            $param = $i + 1;
            if ($val === null) {
                $stmt->bindValue($param, null, PDO::PARAM_NULL);
            } elseif (is_bool($val)) {
                $stmt->bindValue($param, $val ? 1 : 0, PDO::PARAM_INT);
            } elseif (is_int($val)) {
                $stmt->bindValue($param, $val, PDO::PARAM_INT);
            } elseif (is_float($val)) {
                $stmt->bindValue($param, (string)$val);
            } else {
                $stmt->bindValue($param, (string)$val);
            }
        }
        $stmt->execute();
        $lid = $db->lastInsertId();
        jsonResponse([
            'ok' => true,
            'last_insert_id' => ($lid !== false && $lid !== '' && $lid !== '0') ? $lid : null,
        ]);
    } catch (Throwable $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// PATCH /api/admin/rows  body: { "table": "users", "pk": { "id": "1" }, "row": { "bio": "..." } }
if ($id === 'rows' && $method === 'PATCH') {
    requireAdminJwt();
    $db = Database::get();
    $body = getJsonBody();
    if (!is_array($body)) {
        jsonResponse(['error' => 'Invalid JSON'], 400);
    }
    $table = isset($body['table']) ? preg_replace('/[^a-z_0-9]/', '', (string)$body['table']) : '';
    if (!in_array($table, ADMIN_ALLOWED_TABLES, true)) {
        jsonResponse(['error' => 'Invalid table'], 400);
    }
    $pk = $body['pk'] ?? null;
    if (!is_array($pk) || $pk === []) {
        jsonResponse(['error' => 'pk required'], 400);
    }
    $row = $body['row'] ?? null;
    if (!is_array($row)) {
        jsonResponse(['error' => 'row object required'], 400);
    }

    $cols = $db->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    $byField = [];
    foreach ($cols as $cm) {
        $byField[$cm['Field']] = $cm;
    }
    $pkNames = array_values(array_filter($cols, fn ($c) => ($c['Key'] ?? '') === 'PRI'));
    $pkNameSet = array_flip(array_column($pkNames, 'Field'));

    $setParts = [];
    $setVals = [];
    foreach ($row as $key => $val) {
        $k = preg_replace('/[^a-z_0-9_]/', '', (string)$key);
        if ($k === '' || !isset($byField[$k]) || isset($pkNameSet[$k])) {
            continue;
        }
        $setParts[] = '`' . $k . '` = ?';
        $setVals[] = $val;
    }
    if ($setParts === []) {
        jsonResponse(['error' => 'No columns to update (primary key columns are not editable here)'], 400);
    }

    $where = [];
    $whereVals = [];
    foreach ($pk as $col => $val) {
        $c = preg_replace('/[^a-z_0-9_]/', '', (string)$col);
        if ($c === '') {
            continue;
        }
        $where[] = '`' . $c . '` = ?';
        $whereVals[] = $val;
    }
    if ($where === []) {
        jsonResponse(['error' => 'Invalid pk'], 400);
    }

    $sql = 'UPDATE `' . $table . '` SET ' . implode(', ', $setParts) . ' WHERE ' . implode(' AND ', $where);
    $allVals = array_merge($setVals, $whereVals);
    try {
        $stmt = $db->prepare($sql);
        foreach ($allVals as $i => $val) {
            $param = $i + 1;
            if ($val === null) {
                $stmt->bindValue($param, null, PDO::PARAM_NULL);
            } elseif (is_bool($val)) {
                $stmt->bindValue($param, $val ? 1 : 0, PDO::PARAM_INT);
            } elseif (is_int($val)) {
                $stmt->bindValue($param, $val, PDO::PARAM_INT);
            } elseif (is_float($val)) {
                $stmt->bindValue($param, (string)$val);
            } else {
                $stmt->bindValue($param, (string)$val);
            }
        }
        $stmt->execute();
        jsonResponse(['ok' => true, 'affected' => $stmt->rowCount()]);
    } catch (Throwable $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// DELETE /api/admin/rows  body: { "table": "users", "pk": { "id": "1" } }
if ($id === 'rows' && $method === 'DELETE') {
    requireAdminJwt();
    $db = Database::get();
    $body = getJsonBody();
    if (!is_array($body)) {
        jsonResponse(['error' => 'Invalid JSON'], 400);
    }
    $table = isset($body['table']) ? preg_replace('/[^a-z_0-9]/', '', (string)$body['table']) : '';
    if (!in_array($table, ADMIN_ALLOWED_TABLES, true)) {
        jsonResponse(['error' => 'Invalid table'], 400);
    }
    $pk = $body['pk'] ?? null;
    if (!is_array($pk) || empty($pk)) {
        jsonResponse(['error' => 'pk required'], 400);
    }
    $where = [];
    $vals = [];
    foreach ($pk as $col => $val) {
        $c = preg_replace('/[^a-z_0-9_]/', '', (string)$col);
        if ($c === '') {
            continue;
        }
        $where[] = "`$c` = ?";
        $vals[] = $val;
    }
    if (empty($where)) {
        jsonResponse(['error' => 'Invalid pk'], 400);
    }
    try {
        $db->prepare('DELETE FROM `' . $table . '` WHERE ' . implode(' AND ', $where))->execute($vals);
        jsonResponse(['ok' => true]);
    } catch (Throwable $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// GET /api/admin/logs?lines=200
if ($id === 'logs' && $method === 'GET') {
    requireAdminJwt();
    $lines = min(500, max(10, (int)($_GET['lines'] ?? 200)));
    $path = __DIR__ . '/../../logs/api_errors.log';
    if (!is_file($path)) {
        jsonResponse(['lines' => []]);
    }
    $content = @file($path, FILE_IGNORE_NEW_LINES);
    if ($content === false) {
        jsonResponse(['error' => 'Cannot read log'], 500);
    }
    $slice = array_slice($content, -$lines);
    jsonResponse(['lines' => $slice]);
}

jsonResponse(['error' => 'Not found'], 404);
