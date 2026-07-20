.PHONY: test typecheck build dev check db-start db-stop db-reset db-status local-env local-dev

test:
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

dev:
	npm run local:dev

check: test typecheck

db-start:
	npm run db:start

db-stop:
	npm run db:stop

db-reset:
	npm run db:reset

db-status:
	npm run db:status

local-env:
	npm run local:env

local-dev:
	npm run local:dev
