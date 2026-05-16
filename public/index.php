<?php

require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/helpers.php';

// Global error logging
$logDir = __DIR__ . '/../logs';
$logFile = $logDir . '/api_errors.log';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log all PHP errors to file
set_error_handler(function ($severity, $message, $file, $line) use ($logFile) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'type' => 'php_error',
        'severity' => $severity,
        'message' => $message,
        'file' => $file,
        'line' => $line,
        'request' => [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        ],
    ];
    
    // Add request body if available (for POST, PUT, PATCH)
    if (in_array($_SERVER['REQUEST_METHOD'] ?? '', ['POST', 'PUT', 'PATCH'])) {
        $body = file_get_contents('php://input');
        if ($body) {
            $logEntry['request']['body'] = $body;
            // Reset input stream for further processing
            file_put_contents('php://input', $body);
        }
    }
    
    // Add authenticated user info if available
    try {
        $authHeader = getallheaders()['Authorization'] ?? getallheaders()['authorization'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $m)) {
            $token = $m[1];
            $db = Database::get();
            $stmt = $db->prepare('SELECT id, username FROM users WHERE api_token = ? AND is_active = 1');
            $stmt->execute([$token]);
            $user = $stmt->fetch();
            if ($user) {
                $logEntry['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                ];
            }
        }
    } catch (Exception $e) {
        // Ignore if auth fails
    }
    
    $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
    
    // Use default error handler too
    return false;
});

// Log uncaught exceptions
set_exception_handler(function ($exception) use ($logFile) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'type' => 'uncaught_exception',
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString(),
        'request' => [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        ],
    ];
    
    // Add request body if available (for POST, PUT, PATCH)
    if (in_array($_SERVER['REQUEST_METHOD'] ?? '', ['POST', 'PUT', 'PATCH'])) {
        $body = file_get_contents('php://input');
        if ($body) {
            $logEntry['request']['body'] = $body;
        }
    }
    
    // Add authenticated user info if available
    try {
        $authHeader = getallheaders()['Authorization'] ?? getallheaders()['authorization'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $m)) {
            $token = $m[1];
            $db = Database::get();
            $stmt = $db->prepare('SELECT id, username FROM users WHERE api_token = ? AND is_active = 1');
            $stmt->execute([$token]);
            $user = $stmt->fetch();
            if ($user) {
                $logEntry['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                ];
            }
        }
    } catch (Exception $e) {
        // Ignore if auth fails
    }
    
    $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
    
    // Return 500 error
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Internal server error'], JSON_UNESCAPED_UNICODE);
    exit;
});

// Log fatal errors
register_shutdown_function(function () use ($logFile) {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => 'fatal_error',
            'message' => $error['message'],
            'file' => $error['file'],
            'line' => $error['line'],
            'request' => [
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
                'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            ],
        ];
        
        // Add request body if available (for POST, PUT, PATCH)
        if (in_array($_SERVER['REQUEST_METHOD'] ?? '', ['POST', 'PUT', 'PATCH'])) {
            $body = file_get_contents('php://input');
            if ($body) {
                $logEntry['request']['body'] = $body;
            }
        }
        
        // Add authenticated user info if available
        try {
            $authHeader = getallheaders()['Authorization'] ?? getallheaders()['authorization'] ?? '';
            if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $m)) {
                $token = $m[1];
                $db = Database::get();
                $stmt = $db->prepare('SELECT id, username FROM users WHERE api_token = ? AND is_active = 1');
                $stmt->execute([$token]);
                $user = $stmt->fetch();
                if ($user) {
                    $logEntry['user'] = [
                        'id' => $user['id'],
                        'username' => $user['username'],
                    ];
                }
            }
        } catch (Exception $e) {
            // Ignore if auth fails
        }
        
        $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
        file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
});

// Log request start
$requestLogEntry = [
    'timestamp' => date('Y-m-d H:i:s'),
    'type' => 'request',
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
];
file_put_contents($logFile, json_encode($requestLogEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/+#', '', $path);
$path = preg_replace('#\?.*$#', '', $path);

$method = $_SERVER['REQUEST_METHOD'];
$segments = $path ? explode('/', $path) : [];
$firstSeg = strtolower((string)($segments[0] ?? ''));

// Не API — отдаём веб-модуль или статику (на случай если nginx отдаёт всё в index.php)
if ($firstSeg !== 'api') {
    $webDir = realpath(__DIR__ . '/../web') ?: (__DIR__ . '/../web');
    $requestPath = $path === '' ? 'index.html' : $path;
    $requestPath = str_replace(['../', '..\\'], '', $requestPath);

    // Браузерные пути Next-админки (/admin/*): при прямом заходе на контейнер app PHP
    // раньше отдавал JSON-заглушку. Редирект на публичный URL прокси (APP_URL).
    // Старая PHP-админка через /legacy-admin: прокси ставит X-Bartery-Public-Base — не редиректим.
    if ($firstSeg === 'admin') {
        $legacyBase = trim((string)($_SERVER['HTTP_X_BARTERY_PUBLIC_BASE'] ?? ''));
        if ($legacyBase !== '/legacy-admin' && in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
            $cfg = require __DIR__ . '/../src/config.php';
            $cfgUrl = rtrim((string)($cfg['app']['url'] ?? 'http://localhost:8080'), '/');
            $pub = parse_url($cfgUrl) ?: [];
            $pubScheme = strtolower((string)($pub['scheme'] ?? 'http'));
            $pubHost = strtolower((string)($pub['host'] ?? 'localhost'));
            $pubPort = isset($pub['port']) ? (int)$pub['port'] : ($pubScheme === 'https' ? 443 : 80);
            if (in_array($pubHost, ['127.0.0.1', '::1'], true)) {
                $pubHost = 'localhost';
            }

            $xfProto = strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
            $reqHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $xfProto === 'https';
            $reqScheme = $reqHttps ? 'https' : 'http';
            $hh = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
            $reqHost = $hh;
            $reqPort = $reqScheme === 'https' ? 443 : 80;
            if (str_contains($hh, ':')) {
                $hp = explode(':', $hh, 2);
                $reqHost = $hp[0];
                $reqPort = (int)$hp[1];
            }
            if (in_array($reqHost, ['127.0.0.1', '::1'], true)) {
                $reqHost = 'localhost';
            }

            // Редирект только если запрос пришёл не на тот же публичный origin (например, прямой заход на порт app).
            // Иначе 302 на тот же URL → ERR_TOO_MANY_REDIRECTS в браузере.
            $samePublicOrigin = ($reqScheme === $pubScheme && $reqHost === $pubHost && $reqPort === $pubPort);
            if ($samePublicOrigin) {
                http_response_code(503);
                header('Content-Type: text/html; charset=utf-8');
                echo '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Админка</title></head><body style="font-family:system-ui;padding:2rem">';
                echo '<h1>Сервис админки недоступен с PHP</h1>';
                echo '<p>Путь <code>/admin</code> должен отдавать контейнер <strong>frontend</strong> (Next.js) через reverse proxy, а не PHP.</p>';
                echo '<p>Проверьте: <code>docker compose ps</code> — контейнер <code>bartery_frontend</code> в состоянии Up; образ прокси с актуальным <code>docker/proxy.conf</code>: <code>docker compose build proxy && docker compose up -d proxy</code> (команда <code>docker compose up --build frontend</code> прокси не пересобирает).</p>';
                echo '</body></html>';
                exit;
            }

            $base = $pubScheme . '://' . $pubHost;
            if (($pubScheme === 'http' && $pubPort !== 80) || ($pubScheme === 'https' && $pubPort !== 443)) {
                $base .= ':' . $pubPort;
            }
            $uri = $_SERVER['REQUEST_URI'] ?? '/';
            $pathOnly = parse_url($uri, PHP_URL_PATH) ?: '/';
            $qs = parse_url($uri, PHP_URL_QUERY);
            $loc = $base . $pathOnly;
            if ($qs !== null && $qs !== false && $qs !== '') {
                $loc .= '?' . $qs;
            }
            header('Location: ' . $loc, true, 302);
            exit;
        }
    }

    // uploads/ — из корня проекта; для несуществующих файлов отдаём чистый 404,
    // чтобы фронт не получал HTML/JSON-фолбэк с Content-Type, отличным от image/*.
    if (strpos($requestPath, 'uploads/') === 0) {
        $file = __DIR__ . '/../' . $requestPath;
        if (is_file($file)) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            $mimes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp'];
            if (isset($mimes[$ext])) header('Content-Type: ' . $mimes[$ext]);
            readfile($file);
            exit;
        }
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not Found';
        exit;
    }
    $file = $webDir . '/' . $requestPath;
    if (is_file($file)) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if ($ext === 'php') {
            chdir(dirname($file));
            require $file;
            exit;
        }
        $mimes = ['html' => 'text/html', 'css' => 'text/css', 'js' => 'application/javascript', 'json' => 'application/json', 'ico' => 'image/x-icon', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'svg' => 'image/svg+xml'];
        if (isset($mimes[$ext])) {
            header('Content-Type: ' . $mimes[$ext] . '; charset=utf-8');
        }
        readfile($file);
        exit;
    }
    if (is_dir($file)) {
        $dir = rtrim($file, '/');
        foreach (['index.html', 'index.php'] as $idx) {
            $indexFile = $dir . '/' . $idx;
            if (!is_file($indexFile)) {
                continue;
            }
            if ($idx === 'index.php') {
                chdir($dir);
                require $indexFile;
                exit;
            }
            header('Content-Type: text/html; charset=utf-8');
            readfile($indexFile);
            exit;
        }
    }
    if ($requestPath === 'index.html' || $requestPath === '') {
        $file = $webDir . '/index.html';
        if (is_file($file)) {
            header('Content-Type: text/html; charset=utf-8');
            readfile($file);
            exit;
        }
    }
    jsonResponse(['message' => 'Skills Exchange API', 'version' => '1.0']);
}

$resource = $segments[1] ?? '';
$id = $segments[2] ?? null;
$sub = $segments[3] ?? null;
$subId = $segments[4] ?? null;

// Special handling for /api/call/* and /api/calls/* endpoints
// /api/call/start -> resource='call', id=null, sub='start'
// /api/call/join/5 -> resource='call', id=5, sub='join'
// /api/call/cancel/5 -> resource='call', id=5, sub='cancel'
// /api/calls/5 -> resource='calls', id=5, sub=null
if (in_array($resource, ['call', 'calls'])) {
    if ($id !== null && !is_numeric($id)) {
        // Second segment is an action (start, join, cancel, end), not an ID
        $action = $id;  // save the action from segment 2
        $id = $sub;     // segment 3 (if exists) becomes the ID
        $sub = $action; // segment 2 becomes the action/sub
    }
    // else: /api/call/5 or /api/calls/5 -> second segment is numeric ID, keep as is
    // /api/call or /api/calls -> no second segment, keep id=null, sub=null
}

try {
    $db = Database::get();
} catch (PDOException $e) {
    jsonResponse(['error' => 'Database connection failed'], 500);
}

// Auth routes
if ($resource === 'auth') {
    require __DIR__ . '/../src/api/auth.php';
    exit;
}

// Categories
if ($resource === 'categories') {
    require __DIR__ . '/../src/api/categories.php';
    exit;
}

// Skills
if ($resource === 'skills') {
    require __DIR__ . '/../src/api/skills.php';
    exit;
}

// Public catalog: users who teach a skill (for React / mobile)
if ($resource === 'teach-offers') {
    require __DIR__ . '/../src/api/teach-offers.php';
    exit;
}

// Public leaderboard by points
if ($resource === 'leaderboard') {
    require __DIR__ . '/../src/api/leaderboard.php';
    exit;
}

// Admin panel API (password + separate JWT, not user api_token)
if ($resource === 'admin') {
    require __DIR__ . '/../src/api/admin.php';
    exit;
}

// Users
if ($resource === 'users') {
    require __DIR__ . '/../src/api/users.php';
    exit;
}

// Messages
if ($resource === 'messages') {
    require __DIR__ . '/../src/api/messages.php';
    exit;
}

// Reviews
if ($resource === 'reviews') {
    require __DIR__ . '/../src/api/reviews.php';
    exit;
}

// Call endpoints
if ($resource === 'call' || $resource === 'calls') {
    require __DIR__ . '/../src/api/calls.php';
    exit;
}

// Push tokens
if ($resource === 'push-tokens') {
    require __DIR__ . '/../src/api/user_push_tokens.php';
    exit;
}

// Badges
if ($resource === 'badges') {
    require __DIR__ . '/../src/api/badges.php';
    exit;
}

// User skills
if ($resource === 'user-skills') {
    require __DIR__ . '/../src/api/user-skills.php';
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
