# Plan Generator

Turn a goal into a day-by-day plan. Describe what you want to learn and how much time you have, and get a task for every day, a checkpoint every few days, and a chat to adjust the plan as your week changes.

Each person brings their own AI key (Gemini, OpenRouter, Anthropic or OpenAI). Keys are stored encrypted, and only the last four characters are ever shown.

## How generation works

1. An outliner makes one structured call that splits the goal into blocks of a few days, each with its own scope and a milestone.
2. A block writer then writes each block in turn. It is given a ledger of everything already taught, so nothing repeats.
3. Each block is validated and checked for duplicate titles, retried once with feedback if needed, then saved to Postgres before the next one starts.
4. Generation runs as a job in a Redis queue (BullMQ). If the server stops, the job is picked up again and continues from the first block that is not saved. Plans can also be paused, cancelled and resumed.

## Stack

SvelteKit 3 (Svelte 5 runes), TypeScript, Tailwind CSS v4, shadcn-svelte on Bits UI, Svelte AI Elements for the chat, Bun. Drizzle with PostgreSQL, Better Auth, Vercel AI SDK v7 with zod, BullMQ on Redis, pino for logs.

## Setup

Requires [Bun](https://bun.sh) and [Docker](https://www.docker.com).

```sh
bun install
cp .env.example .env
```

Fill in `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` in `.env` (`openssl rand -base64 32` for each), then start everything:

```sh
docker compose up -d
```

This runs PostgreSQL (host port 5433), Redis (host port 6379) and the dev server at <http://localhost:5173> with live reload. Apply the database migrations from your machine:

```sh
bun run db:migrate
```

After adding a package, rebuild the app container with `docker compose up -d --build`.

To run only the services and use the dev server on your machine instead, start `docker compose up -d postgres redis` and then `bun run dev`. `.env` uses `localhost` URLs, which works for that and for the tests; the compose file swaps in the container hostnames for the app container.

## Scripts

| Script                                         | What it does                             |
| ---------------------------------------------- | ---------------------------------------- |
| `bun run dev`                                  | Start the dev server                     |
| `bun run build` / `bun run preview`            | Production build and local preview       |
| `bun run check`                                | Type check with svelte-check             |
| `bun run lint` / `bun run format`              | Prettier and ESLint / format the code    |
| `bun run test`                                 | Unit and integration tests (Vitest)      |
| `bun run test:e2e` / `bun run test:e2e:headed` | End-to-end tests in Google Chrome        |
| `bun run db:generate`                          | Create a migration after a schema change |
| `bun run db:migrate`                           | Apply migrations                         |
| `bun run db:studio`                            | Browse the database with Drizzle Studio  |

Tests that need the database or Redis use the URLs in `.env` and are skipped when those are missing. They create and remove their own data. The AI is replaced by a deterministic fake model in tests, so no API key is needed. End-to-end tests use the Chrome installed on your machine (`channel: 'chrome'` in `playwright.config.ts`) and reuse the running dev server. Set `SLOWMO=800` to slow each step down when running headed.

## Project structure

```
src/
  env.ts                    environment variables, validated at startup
  hooks.server.ts           sessions, startup recovery, shutdown
  routes/                   pages, layout, global styles and theme tokens
    (app)/plans/[id]/events live progress stream (server-sent events)
  lib/
    limits.ts               limits shared by server and client
    plan-validation.ts      plan request validation
    components/             ui (shadcn-svelte), ai-elements, chat, shared, landing
    server/
      db/                   Drizzle schema and client
      ai/                   prompts, outliner, block writer, validators, ledger,
                            model list and compatibility check, fake model
      plans/                store, worker, Redis queue and events, plan service
      services/             encrypted provider keys
      crypto/               AES-256-GCM vault
      config.ts, logger.ts  server settings and the redacting logger
drizzle/                    generated migrations
scripts/                    migration runner and container start script
e2e/                        Playwright tests
```

Imports use the `#lib/...` subpath alias.

## Environment variables

Declared in `src/env.ts`. See `.env.example`.

| Variable                                                        | Purpose                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`                                                  | PostgreSQL connection string                            |
| `REDIS_URL`                                                     | Redis connection string (generation queue, live events) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                         | Session signing secret and public app URL               |
| `ENCRYPTION_KEY`                                                | 32 bytes, base64. Encrypts saved AI keys                |
| `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`            | Optional sign-in providers                              |
| `RESEND_API_KEY`, `EMAIL_FROM`                                  | Optional verification and reset emails                  |
| `LIMIT_AI_PER_HOUR`, `LIMIT_PLANS_PER_USER`, `LIMIT_CHAT_CHARS` | Optional usage limits                                   |
| `AI_FAKE`                                                       | Tests only. Replaces providers with a fake model        |
| `LOG_LEVEL`                                                     | Optional log level (default `info`, `debug` in dev)     |

Losing `ENCRYPTION_KEY` makes saved AI keys unreadable, so back it up.

## Deploying

`Dockerfile` builds a production image (Bun build, Node runtime, non-root user) that runs the migrations and then starts the server. `docker-compose.dokploy.yml` runs it with Postgres and Redis for Dokploy; set the variables from `.env.dokploy.example` in the project's Environment tab and attach your domain to the `app` service on port 3000.
