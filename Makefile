.PHONY: test typecheck build dev check

test:
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

dev:
	npm run dev

check: test typecheck
