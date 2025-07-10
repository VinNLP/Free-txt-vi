ifndef PROJECT_NAME
PROJECT_NAME := free-txt
endif

ifndef DOCKER_BIN
DOCKER_BIN := docker
endif

ifndef DOCKER_COMPOSE_BIN
DOCKER_COMPOSE_BIN := docker compose
endif

COMPOSE := PROJECT_NAME=${PROJECT_NAME} ${DOCKER_COMPOSE_BIN} -f build/compose/docker-compose.yml
API_COMPOSE := ${COMPOSE} run --name ${PROJECT_NAME}_api --rm --service-ports -w /api api

build-base-image:
	$(DOCKER_BIN) build -t $(PROJECT_NAME)/backend:base -f build/api.base.Dockerfile .
	-${DOCKER_BIN} images -q -f "dangling=true" | xargs ${DOCKER_BIN} rmi -f

teardown:
	${COMPOSE} down -v
	${COMPOSE} rm --force --stop -v

setup:
	make build-base-image

api-run:
	${API_COMPOSE} sh -c 'python runner/main.py'

node-setup:
	nvm use 20
web-run:
	cd web && yarn dev