# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16** ERP application (LIVASOFA Super ERP) using **SQLite** (embedded via `better-sqlite3`) as its primary database. No external database service is needed for local development.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev:simple` (port 3000) |
| Lint | `npx eslint --max-warnings 1000` |
| Unit tests | `npm test` |
| Build | `npm run build` |
| E2E tests | `npm run test:e2e` (requires running dev server + Playwright browsers) |

### Environment setup

- A `.env.local` file is required with at minimum `JWT_SECRET` (16+ chars). Without it, auth endpoints crash.
- The SQLite database is auto-created at `data/erp.db` on first server request. No migrations or manual DB setup needed.
- Do **not** set `DATABASE_URL` in `.env.local` unless you want to override the default path; the default `data/erp.db` is correct for local dev.
- Default admin credentials: `admin` / `admin1234` (auto-seeded on DB creation).

### Gotchas

- The `prepare` script (`husky install`) fails during `npm install` because `husky` is not listed in `package.json` dependencies. Use `npm install --ignore-scripts` to work around this.
- The repo has ~5 pre-existing lint errors (React hooks rules, compilation issues) and ~1448 warnings. The pre-commit hook uses `--max-warnings 1000`.
- `npm run dev` starts an HTTPS server via `server-https.js` with self-signed certs; prefer `npm run dev:simple` for plain HTTP development.
- The `mobile-rts-game/` directory is a separate React Native project excluded from the main build/lint. Ignore it for ERP development.
