# Bartery

Платформа обмена навыками: PHP API + MySQL + React/Next.js frontend, запущенные в Docker.

## Что сейчас в проекте

- `frontend` — Next.js (исходники в `web/react`, сборка Docker с контекстом `./web`).
- `app` — PHP API (`public/index.php`, `src/api/*`) и раздача `web/*` (в т.ч. `/admin`).
- `proxy` — Apache reverse proxy, единая точка входа на `http://localhost:8080`.
- `mysql` — MySQL 8.0 с инициализацией из `db/init.sql`.

## Быстрый старт (рекомендуется)

### Требования

- Docker Desktop (или Docker Engine + Compose plugin)

### Запуск (production, по умолчанию)

Из корня репозитория:

```bash
docker compose up -d --build
```

или через `make`:

```bash
make up
```

### Запуск (development, hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

или через `make`:

```bash
make up-dev
```

### Открыть в браузере

- Приложение (React): `http://localhost:8080`
- Админка: `http://localhost:8080/admin`
- Прямой frontend: `http://localhost:3000`
- API пример: `http://localhost:8080/api/categories`

### Остановка

```bash
docker compose down
```

для dev-режима:

```bash
make down-dev
```

## Переменные окружения

`docker-compose.yml` уже содержит рабочие значения по умолчанию через fallback в коде.
При необходимости можно создать `.env` в корне проекта:

```env
# DB (app)
DB_HOST=mysql
DB_NAME=skills_exchange
DB_USER=skills_user
DB_PASS=skills_pass

# MySQL container
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=skills_exchange
MYSQL_USER=skills_user
MYSQL_PASSWORD=skills_pass

# App URL
APP_URL=http://localhost:8080
```

Важно: в текущем `docker-compose.yml` используются плейсхолдеры вида `${skills_exchange}`, `${skills_user}`, `${skills_pass}`, `${rootpass}`.
Если не хотите полагаться на defaults, задайте эти значения в `.env`.

## Архитектура роутинга

- `proxy` направляет:
  - `/api/*`, `/uploads/*` и `/admin/*` -> `app`
  - всё остальное -> `frontend`
- Next.js также имеет rewrites `/api/*` и `/uploads/*` на backend (для прямого запуска frontend).

## Docker-сервисы

- `proxy` (`skills-exchange-proxy`) — порт `8080:80`
- `app` (`skills-exchange-app`) — PHP API и статика/админка из `web/`
- `frontend` (`bartery_frontend`) — Next.js (`3000:3000`)
- `mysql` (`skills-exchange-mysql`) — `3306:3306`

## Основные API эндпоинты

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Users

- `GET /api/users`
- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/avatar`
- `DELETE /api/users/me/avatar`
- `GET /api/users/me/skills`
- `POST /api/users/me/skills`
- `DELETE /api/users/me/skills/{skillId}`
- `GET /api/users/{id}`
- `GET /api/users/search?teach={skillId}&learn={skillId}`

### Catalog

- `GET /api/categories`
- `GET /api/skills`
- `POST /api/skills`
- `GET /api/teach-offers?limit=...`
- `GET /api/leaderboard?limit=...`

### Messages & Reviews

- `GET /api/messages`
- `GET /api/messages/{userId}`
- `POST /api/messages`
- `GET /api/reviews/{userId}`
- `POST /api/reviews`

### Calls

- `POST /api/call/start`
- `POST /api/call/join/{callId}`
- `POST /api/call/cancel/{callId}`
- `POST /api/call/end/{callId}`
- `GET /api/calls/{callId}`
- `GET /api/calls/user/{userId}`

### Badges / Push Tokens

- `GET /api/badges`
- `GET /api/badges/user/{userId}`
- `GET /api/push-tokens`
- `POST /api/push-tokens`
- `DELETE /api/push-tokens/{id}`

## Видеозвонки

- На фронте используются `@jitsi/react-sdk` и встроенная модалка в чате.
- Текущий Jitsi server URL: `calls.disroot.org`.
- Backend логирует события звонков в `logs/video_calls.log`.

## Полезные команды

### Make shortcuts

```bash
make up          # production запуск
make up-dev      # development запуск
make down        # остановка production стека
make down-dev    # остановка development стека
make restart     # перезапуск production
make restart-dev # перезапуск development
make logs        # логи docker compose
make ps          # список контейнеров
```

### Проверить контейнеры

```bash
docker compose ps
```

### Логи frontend

```bash
docker compose logs frontend --tail=200
```

### Полная пересборка

```bash
docker compose down
docker compose up -d --build
```

## Частые проблемы

### 1) `Module not found: Can't resolve '@jitsi/react-sdk'`

Пересобери frontend-образ:

```bash
docker compose up -d --build frontend proxy
```

### 2) Ошибка Docker BuildKit `failed to prepare extraction snapshot`

Это битый локальный cache Docker:

```bash
docker compose down
docker builder prune -af
docker buildx prune -af
docker compose up -d --build
```

### 3) Не подхватываются изменения frontend

- Убедись, что открываешь `http://localhost:8080`
- Обнови страницу hard reload (`Cmd+Shift+R`)
- Проверь `docker compose logs frontend`
