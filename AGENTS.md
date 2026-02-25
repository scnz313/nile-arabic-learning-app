# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Nile Arabic Learning — an Expo (React Native) mobile/web app with a co-located Express backend (tRPC). See `server/README.md` for backend architecture details.

### Running the app

- **Both servers**: `pnpm dev` (runs backend + Metro concurrently)
- **Backend only**: `pnpm dev:server` (Express on port 3000)
- **Frontend only**: `pnpm dev:metro` (Expo/Metro on port 8081)
- **Health check**: `curl http://localhost:3000/api/health`

### Key commands

| Task | Command |
|------|---------|
| Lint | `pnpm lint` |
| Type check | `pnpm check` |
| Tests | `pnpm test` |
| Build (server) | `pnpm build` |

### Non-obvious caveats

- The database connection is lazy: the app starts and serves requests without `DATABASE_URL`. Auth/user features won't work, but the UI renders and the API health endpoint responds.
- OAuth warnings (`OAUTH_SERVER_URL is not configured`) appear at server startup without credentials — safe to ignore for local dev.
- `pnpm lint` exits with code 1 due to a pre-existing `react-hooks/rules-of-hooks` error in `app/lesson/[id].tsx` plus 16 warnings. This is existing code, not a regression.
- Expo may log deprecation warnings about `shadow*` props and `pointerEvents` — these are cosmetic and do not affect functionality.
- `.npmrc` specifies `node-linker=hoisted` which is required for Expo compatibility.
- The `packageManager` field in `package.json` pins pnpm to 9.12.0.
- External services (Moodle at nilecenter.online, Manus OAuth, Manus Forge API) are remote-hosted. The app degrades gracefully without them — course lists will be empty but the UI shell works.
