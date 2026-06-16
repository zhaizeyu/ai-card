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

Development server scripts:

```bash
npm run app:start
npm run app:status
npm run app:restart
npm run app:stop
```

The default development port is `3002`. Override it when needed:

```bash
PORT=3000 npm run app:start
PORT=3000 npm run app:stop
```

If `OPENAI_API_KEY` is empty, card copy uses a local fallback generator so the MVP still works.
