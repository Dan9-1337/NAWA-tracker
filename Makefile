.DEFAULT_GOAL := help

.PHONY: help install setup up dev dev-new dev-returning stop-dev down wait-db db-start db-stop db-reset db-status local-env local-env-new local-env-returning local-dev test typecheck build check

help: ## Show available targets
	@echo "Quick start:"
	@echo "  make dev-new     first-time user flow (no saved profile)"
	@echo "  make dev         returning user with seeded profile"
	@echo "  make setup dev   two commands: prepare, then run app"
	@echo "  make install db-start dev   three commands"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install npm dependencies
	npm install

setup: install db-start ## First-time setup: deps + Supabase Docker
	@echo ""
	@echo "Setup complete. Next: make dev"
	@echo "Or run everything in one step next time: make up"

up: setup wait-db local-env ## Full local stack at http://localhost:3000
	npm run local:dev

dev: wait-db local-env stop-dev local-dev ## Run app as returning user (seeded profile)

dev-new: wait-db local-env-new stop-dev local-dev ## Run app as first-time user (create wizard)

dev-returning: wait-db local-env-returning stop-dev local-dev ## Run app as returning demo user

stop-dev: ## Stop Vite + local API on ports 3000/3001
	@for port in 3000 3001; do \
	  pids=$$(lsof -ti :$$port 2>/dev/null); \
	  if [ -n "$$pids" ]; then \
	    echo "Stopping process on port $$port..."; \
	    kill $$pids 2>/dev/null || true; \
	  fi; \
	done

down: db-stop ## Stop local Supabase

wait-db: ## Wait until Supabase containers are healthy
	@echo "Waiting for Supabase..."
	@i=0; max=90; \
	while [ $$i -lt $$max ]; do \
	  if npx supabase status -o env >/dev/null 2>&1; then \
	    echo "Supabase is ready."; \
	    exit 0; \
	  fi; \
	  i=$$((i + 1)); \
	  sleep 2; \
	done; \
	echo "Supabase did not become ready in $$((max * 2))s. Try: make db-status" >&2; \
	exit 1

db-start: ## Start local Supabase (Docker)
	npm run db:start

db-stop: ## Stop local Supabase
	npm run db:stop

db-reset: ## Reset DB schema + seed data
	npm run db:reset

db-status: ## Show Supabase status
	npm run db:status

local-env: ## Write .env.local for returning demo user
	npm run local:env

local-env-new: ## Write .env.local for first-time user (id 900000002)
	npm run local:env:new

local-env-returning: ## Write .env.local for returning demo user (id 900000001)
	npm run local:env:returning

local-dev: ## Run Vite + local API (needs .env.local)
	npm run local:dev

test: ## Run unit tests
	npm test

typecheck: ## TypeScript check
	npm run typecheck

build: ## Production build
	npm run build

check: test typecheck ## Tests + typecheck
