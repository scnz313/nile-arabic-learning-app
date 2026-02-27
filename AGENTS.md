# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Nile Arabic Learning — an Expo (React Native) + Express/tRPC full-stack app for Arabic language courses. Uses pnpm as package manager.

### Key Commands

Standard dev commands are in `package.json`:
- `pnpm dev` — starts both backend + Metro concurrently
- `pnpm dev:server` — backend only (Express/tRPC, port 3000)
- `pnpm dev:metro` — Expo web only (Metro, port 8081)
- `pnpm lint` — ESLint via `expo lint`
- `pnpm test` — Vitest
- `pnpm check` — TypeScript type check (`tsc --noEmit`)

### Running Services

**Backend (port 3000):** Start with `NODE_ENV=development npx tsx watch server/_core/index.ts`. The server gracefully handles missing `DATABASE_URL` — DB calls return empty/null instead of crashing. OAuth warnings about `OAUTH_SERVER_URL` are expected without credentials.

**Frontend (port 8081):** Start with `EXPO_USE_METRO_WORKSPACE_ROOT=1 npx expo start --web --port 8081`. Initial bundle takes ~15s; subsequent hot reloads are fast.

### Gotchas

- `cross-env` is in `node_modules/.bin` — use `npx cross-env` or set env vars directly when running commands outside of `pnpm` scripts.
- The web version of this React Native app has navigation performance issues (expo-router on web can trigger "Page Unresponsive" dialogs in Chrome). This is a pre-existing codebase issue, not an environment problem. The app is primarily designed for native mobile platforms.
- Lint has 1 pre-existing error (react-hooks/rules-of-hooks in `app/lesson/[id].tsx`) and 18 warnings. These are in the existing code.
- The test suite has 1 skipped test (`tests/auth.logout.test.ts`) — marked `.skip` intentionally until auth is fully implemented.
- No `.env` file exists by default. The server uses `dotenv/config` and the custom `scripts/load-env.js` loader, but runs fine without any env file — external services (DB, OAuth, Forge API) degrade gracefully.
- Health check: `curl http://localhost:3000/api/health` should return `{"ok":true,...}`.
