# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Nile Arabic Learning App — an Expo/React Native + Express single-product codebase. The frontend runs as a web app (Expo web) on Metro (port 8081) and the backend is an Express/tRPC API server (port 3000). Uses pnpm 9.12 as package manager.

### Running services

- **Dev (both):** `pnpm dev` — starts Express API and Metro bundler concurrently via `concurrently`.
- **API only:** `pnpm dev:server` — Express on port 3000; health check at `GET /api/health`.
- **Metro only:** `pnpm dev:metro` — Expo web on port 8081.

### Commands reference

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Lint | `pnpm lint` |
| Type check | `pnpm check` |
| Tests | `pnpm test` |
| Dev servers | `pnpm dev` |
| Build | `pnpm build` |
| DB migrations | `pnpm db:push` |

### Non-obvious caveats

- The server starts without a database — `getDb()` returns `null` and database operations gracefully degrade. No `DATABASE_URL` is needed for basic frontend development.
- OAuth login requires external env vars (`OAUTH_SERVER_URL`, `VITE_APP_ID`, `JWT_SECRET`) which are not present locally. The Moodle login flow (email/password on `/login`) goes through the Express proxy and requires connectivity to `nilecenter.online`.
- Lint exits with code 1 due to pre-existing warnings/errors in the codebase (not environment issues). The one ESLint error is a React hooks rule violation in `app/lesson/[id].tsx`.
- The test suite has one skipped test (`tests/auth.logout.test.ts`) gated behind a `.skip` — this is intentional until authentication is fully wired.
- Metro bundling logs several `EXPO_USE_METRO_WORKSPACE_ROOT` deprecation warnings — these are cosmetic and can be ignored.
