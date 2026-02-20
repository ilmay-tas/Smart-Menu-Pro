# Smart Menu Pro

Restaurant management platform with QR-based ordering, kitchen/waiter flows, and an owner dashboard.

## Requirements
- Node.js 18+ (recommended)
- PostgreSQL (local) **or** Docker (to run PostgreSQL in a container)

## Setup
Install dependencies:
```bash
npm install
```

Create a database and set `DATABASE_URL`.
You can also put it in a `.env` file (see `.env.example`).

Using `.env`:
```bash
cp .env.example .env
# edit .env and set DATABASE_URL
```

### Option A: Docker (no local Postgres needed)
```bash
docker run --name smartmenu-postgres -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=mydine -p 5432:5432 -d postgres:15
export DATABASE_URL="postgres://postgres:pass@localhost:5432/mydine"
```

### Option B: Local Postgres (no Docker needed)
```bash
# example for local setup
createdb mydine
export DATABASE_URL="postgres://<your_user>@localhost:5432/mydine"
```

### Option C: Supabase (shared remote DB)
```bash
export DATABASE_URL="postgresql://postgres.<PROJECT_REF>:YOUR_PASSWORD@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=no-verify"
```
Notes:
- Replace `<PROJECT_REF>` and `YOUR_PASSWORD`.
- `sslmode=no-verify` is fine for dev; use a proper CA in production.
Current Supabase Project Ref:
`cufqqezpzvzkfpdmhcig`

Push schema and start dev server:
```bash
npm run db:push
npm run dev
```

Open:
```
http://127.0.0.1:5000
```

## Scripts
- `npm run dev` – start dev server
- `npm run build` – build for production
- `npm run start` – run production build
- `npm run db:push` – push Drizzle schema to DB
