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
    (auth)/                 sign in, sign up, forgot and reset password
    (app)/plans/            list, new plan form, plan page, chat, exports, live stream
    (app)/settings/         AI keys, model default, account, data and privacy, data export
  lib/
    limits.ts, prefs-validation.ts, plan-validation.ts, plan-summary.ts
                            validation and limits shared by server and client
    client/                 chat state, live plan stream, chat dock, drag to dismiss
    components/             ui (shadcn-svelte), ai-elements, chat, plans, settings, shared
    server/
      db/                   Drizzle schema and client
      ai/                   prompts, outliner, block writer, validators, ledger,
                            model list and compatibility check, fake models
      plans/                store, worker, Redis queue and events, plan service, revisions
      chat/                 chat service and store, orchestrator, plan editing tools
      services/             encrypted provider keys, defaults, account deletion
      export/               Markdown, calendar and personal data exports
      crypto/               AES-256-GCM vault
      usage-guard.ts, email.ts, rate-limiter.ts, config.ts, logger.ts
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

`Dockerfile` builds a production image (Bun build, Node runtime, non-root user, about 550 MB) that applies the database migrations and then starts the server. A failed migration stops the container. `docker-compose.dokploy.yml` runs it together with Postgres and Redis.

### On Dokploy

1. Create a **Compose** project that points at this repository and `docker-compose.dokploy.yml`.
2. In the project's **Environment** tab set the variables from `.env.dokploy.example`. Generate `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` with `openssl rand -base64 32`, and pick a strong `POSTGRES_PASSWORD`.
3. Attach your domain to the `app` service, port 3000, with HTTPS.
4. Set `BETTER_AUTH_URL` to exactly that public URL (for example `https://plans.example.com`).
5. Deploy. The app is ready when its health check (`/healthz`) turns green.

The server learns its public address from the proxy's `X-Forwarded-Proto` and `X-Forwarded-Host` headers (the compose file sets `PROTOCOL_HEADER` and `HOST_HEADER`; Dokploy's Traefik sends both). If requests reach the container without them, the server assumes `https` and form posts fail with "Cross-site POST form submissions are forbidden".

### Sign-in with Google or GitHub (optional)

Create an OAuth app with each provider and set the callback URL to `<BETTER_AUTH_URL>/api/auth/callback/google` and `<BETTER_AUTH_URL>/api/auth/callback/github`. Put the client id and secret in the Environment tab. A button appears only when both values are set.

### Email (optional)

Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on a domain you have **verified in Resend**; with an unverified domain Resend only delivers to your own address and new users would be locked out) to turn on:

- **Email verification with a 6-digit code.** Signing up, or signing in to an unverified account, sends a code (10 minutes, 5 wrong tries, one email per address every 60 seconds and at most 5 per hour) and opens the code page. Verifying also signs you in, and lets the same address sign in with Google or GitHub.
- **Password reset by link**, and "Forgot password?" on the sign-in page.
- HTML emails with a dark variant and a plain-text twin.

Without the two variables there is no verification and those pages answer 404. Messages to reserved test addresses (`example.com`, `.test`, `.invalid`, `.localhost`) are never sent; they are kept in Redis for 5 minutes so the end-to-end tests can read the code.

### Backups and the encryption key

- Back up the `postgres_data` volume with Dokploy's backup feature, or run `docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql` on a schedule. Redis only holds the job queue and live events, so it needs no backup.
- **Back up `ENCRYPTION_KEY` separately.** Without it every saved AI key in a restored database is unreadable and users must add their keys again.

### Trying the production image locally

```sh
cp .env.dokploy.example .env.smoke   # fill in the secrets, set BETTER_AUTH_URL=http://localhost:3100
printf "services:\n  app:\n    ports:\n      - '3100:3000'\n" > smoke.override.yml
docker compose -p smoke -f docker-compose.dokploy.yml -f smoke.override.yml --env-file .env.smoke up --build -d
BASE_URL=http://localhost:3100 bun run test:e2e   # sends the proxy headers a real deployment gets
docker compose -p smoke -f docker-compose.dokploy.yml -f smoke.override.yml --env-file .env.smoke down -v
```

Add `AI_FAKE: '1'` under `environment:` in the override to also run the tests that need the fake model. Never set it in production.

### Updating

Redeploy from Dokploy. Migrations run on start and are safe to repeat. Existing plans, chats and saved keys are kept in the Postgres volume.
