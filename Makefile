COMPOSE = docker compose
DEV_FILES = -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: up up-dev down down-dev build build-dev logs ps restart restart-dev

up:
	$(COMPOSE) up -d --build

up-dev:
	$(COMPOSE) $(DEV_FILES) up -d --build

down:
	$(COMPOSE) down

down-dev:
	$(COMPOSE) $(DEV_FILES) down

build:
	$(COMPOSE) build

build-dev:
	$(COMPOSE) $(DEV_FILES) build

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

restart: down up

restart-dev: down-dev up-dev
