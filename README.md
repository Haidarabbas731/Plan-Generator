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

## Quick start (run it on your own computer)

You need three things installed: [Bun](https://bun.sh) (runs the project), [Docker](https://www.docker.com) (runs the database) and [Git](https://git-scm.com). You do not need to install PostgreSQL or Redis yourself.

**1. Get the code and install packages**

```sh
git clone <this repository's URL>
cd Plan-Generator
bun install
```

**2. Create your settings file**

```sh
cp .env.example .env
```

Open `.env` and fill in the two secrets. Each one is a random 32-byte string. Make them with either command (run it twice, once per secret):

```sh
openssl rand -base64 32
# no openssl (for example on Windows)? use Node instead:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- `BETTER_AUTH_SECRET` signs your login sessions.
- `ENCRYPTION_KEY` encrypts the AI keys people save. **Keep a copy somewhere safe.** If you lose it, every saved AI key becomes unreadable.

Leave everything else as it is. The Google, GitHub and email settings are optional (see below).

**3. Start everything**

```sh
docker compose up -d
bun run db:migrate
```

The first command starts PostgreSQL (port 5433), Redis (port 6379) and the app. The second creates the database tables. Open <http://localhost:5173> and create an account.

**4. Add an AI key**

The app does not include an AI. Each person brings their own key from one of the four providers below, then pastes it in **Settings → AI keys**. Keys are stored encrypted, and only the last four characters are shown.

| Provider      | Where to get a key                            | Good to know                                                         |
| ------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Google Gemini | <https://aistudio.google.com/apikey>          | Has a free tier                                                      |
| OpenRouter    | <https://openrouter.ai/keys>                  | One key for many models; some models are free but often rate limited |
| Anthropic     | <https://console.anthropic.com/settings/keys> | Paid                                                                 |
| OpenAI        | <https://platform.openai.com/api-keys>        | Paid                                                                 |

Then choose **New plan**, describe your goal, pick a model and generate.

**Something not working?** See [Troubleshooting](#troubleshooting).

### Running without Docker for the app

If you would rather run the dev server on your machine (faster reloads), start only the services and then the server:

```sh
docker compose up -d postgres redis
bun run dev
```

`.env` uses `localhost` addresses, which works for this and for the tests. The compose file swaps in the container names for the app container. After adding a package, rebuild the app container with `docker compose up -d --build`.

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
    limits.ts, messages.ts, prefs-validation.ts, plan-validation.ts, plan-summary.ts
                            limits, shared messages and validation used by server and client
    client/                 chat state, live plan stream, chat dock, drag to dismiss
    components/             ui (shadcn-svelte), ai-elements, chat, plans, settings, shared
    server/
      db/                   Drizzle schema and client
      ai/                   prompts, outliner, block writer, validators, ledger,
                            provider registry, provider error handling,
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

Email and password sign-in works without any of this. Each button appears only when **both** its id and its secret are set, so you can add one provider at a time. In every case the callback URL is your public address plus `/api/auth/callback/<provider>` (use `http://localhost:5173` while testing locally). Put the values in `.env` (local) or the Environment tab (Dokploy), then restart or redeploy.

**Google** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

1. Open the [Google Cloud console](https://console.cloud.google.com), pick or create a project.
2. **APIs & Services → OAuth consent screen**: choose External, enter an app name and your email. While the app is in _Testing_, only the Google accounts you list under **Test users** can sign in. Publish it to allow everyone; with the scopes below no Google review is needed.
3. Scopes: only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. These are the defaults and are all sign-in needs. Do not add others.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
5. **Authorised JavaScript origins**: your public address, for example `https://plans.example.com` (no trailing slash).
6. **Authorised redirect URIs**: `https://plans.example.com/api/auth/callback/google`. It must match exactly, otherwise Google answers `redirect_uri_mismatch`. Changes can take a few minutes to apply.
7. Copy the **Client ID** and **Client secret**.

**GitHub** (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL**: your public address. **Authorization callback URL**: `https://plans.example.com/api/auth/callback/github`.
3. Register the app, copy the **Client ID**, then **Generate a new client secret** and copy it straight away (GitHub shows it once).

Signing in with Google or GitHub links to an existing password account only when that account's email is verified, which needs the email setup below.

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

## Troubleshooting

| What you see                                          | Why and what to do                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Connect your AI key first" on **New plan**           | You have not saved a key yet. Add one in **Settings → AI keys** (see the table in Quick start).                                                         |
| A plan stays on "Writing" and nothing happens         | Make sure Redis is running (`docker compose ps`). After editing server code in dev, restart the app: `docker compose restart app`.                      |
| "The provider is rate limiting this model or key"     | The provider is busy or you reached its limit. Free models on OpenRouter hit this often. Wait a minute, or switch model with **Change model**.          |
| "The provider refused this request"                   | The provider said no for this model and key. The message includes the provider's own words; try another model or check the key.                         |
| "Cross-site POST form submissions are forbidden"      | Behind a proxy: `BETTER_AUTH_URL` must be the exact public address, and the proxy must send `X-Forwarded-Proto` and `X-Forwarded-Host` (see Deploying). |
| Google says `redirect_uri_mismatch`                   | The redirect URI in the Google console does not match `<BETTER_AUTH_URL>/api/auth/callback/google` character for character.                             |
| The Google or GitHub button is missing                | Both the id and the secret must be set; then restart or redeploy.                                                                                       |
| Saved AI keys stopped working after a restore or move | `ENCRYPTION_KEY` is different from the one that encrypted them. Use the original key, or add the AI keys again.                                         |
| The database tables are missing                       | Run `bun run db:migrate` (local). In Docker deployments migrations run on every start.                                                                  |
| A Docker build stops or is killed on a small server   | Usually out of memory. Add swap (for example 2 GB) or build on a larger machine.                                                                        |
| Port 5433, 6379 or 5173 is already in use             | Stop the other program using it, or change the port in `docker-compose.yml`.                                                                            |
