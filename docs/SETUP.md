# Setup Guide — Super ERP

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 20.x LTS |
| npm | 10.x |
| Git | 2.x |

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd super-erp

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in JWT_SECRET at minimum

# 4. Start the development server
npm run dev
```

The application will be available at **http://localhost:3000**

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
JWT_SECRET=your-very-long-random-secret-key-here

# Database (optional, defaults to ./data/erp.db)
DATABASE_PATH=./data/erp.db

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=60000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Telegram notifications (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

> **Note:** `JWT_SECRET` must be at least 32 characters long for security. Generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin1234` |

> ⚠️ Change the admin password immediately after first login.

---

## Running Tests

```bash
# Run all tests
npx vitest run

# Run with coverage report
npx vitest run --coverage

# Run in watch mode (development)
npx vitest
```

---

## Code Quality Commands

```bash
# Run ESLint
npm run lint

# TypeScript type check
npx tsc --noEmit

# Run security audit scanner
npx ts-node scripts/security-audit.ts
```

---

## Database

The SQLite database file is located at `data/erp.db`. On first run, the database is automatically created and seeded with initial data.

To inspect the database manually:
```bash
# Using the built-in check script
node check_db_simple.js

# Or using any SQLite GUI tool (e.g. DB Browser for SQLite)
```

---

## Troubleshooting

**App shows blank screen on login:**
- Clear browser cache (Ctrl+F5)
- Check that the dev server is running on port 3000

**Database errors on startup:**
- Ensure `data/` directory exists: `mkdir data`
- Check `DATABASE_PATH` in your `.env`

**Rate limiting issues in development:**
- Increase `RATE_LIMIT_MAX` in `.env` for local testing
