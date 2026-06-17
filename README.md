# AI Monster Card Game

Next.js + TypeScript + Tailwind + Prisma + SQLite MVP for AI monster card generation and componentized auto battle.

## Run

```bash
cp .env.example .env
npm install
npm run prisma:push
npm run app:start
```

Open `http://localhost:3002`.

Fast development server scripts:

```bash
npm run app:start
npm run app:status
npm run app:restart
npm run app:stop
```

`npm run app:start` starts Next.js with Turbopack on port `3002`, keeps the dev cache in `.next-dev`, and prewarms common routes so the first browser visit does less just-in-time compilation. Frontend edits still hot reload. Override the port when needed:

```bash
PORT=3000 npm run app:start
PORT=3000 npm run app:stop
```

Prewarming is intentionally small by default: `/`, `/create`, `/gallery`, `/world`, and `/components`. Customize or disable it when needed:

```bash
PREWARM_ROUTES="/ /gallery" npm run app:start
PREWARM=0 npm run app:start
```

Production scripts are still available when you want to test the built app without hot reload:

```bash
npm run prod:start
npm run prod:status
npm run prod:restart
npm run prod:stop
```

If `OPENAI_API_KEY` is empty, card copy uses a local fallback generator so the MVP still works.
