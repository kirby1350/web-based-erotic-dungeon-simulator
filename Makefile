# Makefile — dungeon adventure simulator
#
# Node >= 20.9 is required (Next 16). This box has Node 24 native, so no Docker
# is needed. pnpm is provided through corepack (`corepack pnpm ...`) so it works
# even when the pnpm shim isn't on PATH.
#
# make (not installed by default on Windows) is needed to run this:
#   winget install GnuWin32.Make      # then add its bin/ to PATH
#   choco install make                # or via Chocolatey
#   # or run these targets inside WSL / Git Bash
#
# Usage:  make setup   ->  make dev        (first run)
#         make dev                          (thereafter)

PNPM := corepack pnpm

.DEFAULT_GOAL := help

.PHONY: help setup install dev build start clean reinstall typecheck

help: ## Show this help
	@echo Targets:
	@echo   setup      Enable pnpm and install deps (run once)
	@echo   dev        Start the dev server on http://localhost:3000
	@echo   build      Production build (next build)
	@echo   start      Serve the production build (next start)
	@echo   typecheck  tsc --noEmit (fast verify, no build)
	@echo   clean      Remove the .next build cache
	@echo   reinstall  Wipe node_modules and reinstall (platform-native binaries)

setup: ## Enable pnpm via corepack, then install
	corepack enable
	corepack prepare pnpm@9 --activate
	$(PNPM) install

install: ## Install dependencies
	$(PNPM) install

dev: ## Start the Next dev server (Turbopack, hot reload)
	$(PNPM) exec next dev -H 0.0.0.0 -p 3000

build: ## Production build
	$(PNPM) exec next build

start: ## Serve the production build
	$(PNPM) exec next start -H 0.0.0.0 -p 3000

typecheck: ## Type-check without building
	$(PNPM) exec tsc --noEmit

clean: ## Remove the .next build cache
	$(PNPM) exec rimraf .next 2>NUL || rm -rf .next

reinstall: ## Fresh install with platform-native binaries
	$(PNPM) exec rimraf node_modules 2>NUL || rm -rf node_modules
	$(PNPM) install
