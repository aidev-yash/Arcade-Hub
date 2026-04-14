# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Desi Game Hub (`artifacts/desi-game-hub`)
- **Type**: React + Vite web app (frontend-only, no backend)
- **Preview path**: `/`
- **Description**: A nostalgic Indian school-themed browser game hub with dark chalkboard aesthetic
- **Games**:
  1. Cut-Cross (Tic Tac Toe) — 2-player same device, score tracking
  2. Tambola (Bingo) — random ticket, auto number caller, line/full-house wins
  3. Sach ya Jhooth (Truth & Dare) — funny/school/crazy categories with popups
  4. Firebox — reaction time game with high scores in LocalStorage
- **Fonts**: Caveat (chalk style), Patrick Hand — loaded via Google Fonts in index.html
- **Storage**: LocalStorage for high scores (Firebox) and last played game
