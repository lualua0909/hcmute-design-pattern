# Convenience targets. Each service is independent - these just save typing.
.PHONY: setup migrate seed reseed build up down logs health

setup:            ## copy every .env.example to .env
	@for d in api-gateway analytics-service inventory-service notification-service frontend; do \
		[ -f $$d/.env ] || cp $$d/.env.example $$d/.env; echo "ready: $$d/.env"; \
	done

migrate:          ## create the MySQL schema
	cd api-gateway && npm run migrate

seed:             ## create the schema and load demo data
	cd api-gateway && npm run migrate -- --seed

reseed:           ## drop the old catalogue, rebuild the schema and reload demo data
	cd api-gateway && npm run migrate -- --reset --seed

build:            ## build all five images
	docker compose build

up:               ## start everything
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

health:           ## probe every service
	@curl -s localhost:8080/health; echo
	@curl -s localhost:9000/health; echo
	@curl -s localhost:8000/health; echo
	@curl -s localhost:7000/health; echo
