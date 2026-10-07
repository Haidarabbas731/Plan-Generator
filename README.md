# Plan Generator

Turn a goal into a day-by-day plan. Describe what you want to learn and how much time you have, and get a task for every day, a checkpoint every few days, and a chat to adjust the plan as your week changes.

Each person brings their own AI key (Gemini, OpenRouter, Anthropic or OpenAI). Keys are stored encrypted, and only the last four characters are ever shown.

> Work in progress. The interface foundation and landing page are in place; accounts, key storage, plan generation and chat are being built.

## Stack

SvelteKit 3 (Svelte 5 runes), TypeScript, Tailwind CSS v4, shadcn-svelte on Bits UI, Svelte AI Elements for the chat, Bun. Planned: Drizzle with PostgreSQL, Better Auth, Vercel AI SDK.

## Setup

Requires [Bun](https://bun.sh).

```sh
bun install
cp .env.example .env
bun run dev
```

The app runs at <http://localhost:5173>. Everything in `.env` is optional for now.

## Scripts

| Script                                         | What it does                          |
| ---------------------------------------------- | ------------------------------------- |
| `bun run dev`                                  | Start the dev server                  |
| `bun run build` / `bun run preview`            | Production build and local preview    |
| `bun run check`                                | Type check with svelte-check          |
| `bun run lint` / `bun run format`              | Prettier and ESLint / format the code |
| `bun run test`                                 | Unit and component tests (Vitest)     |
| `bun run test:e2e` / `bun run test:e2e:headed` | End-to-end tests in Google Chrome     |

End-to-end tests use the Chrome installed on your machine (`channel: 'chrome'` in `playwright.config.ts`). Set `SLOWMO=800` to slow each step down when running headed.

## Project structure

```
src/
  env.ts                  environment variables, validated at startup
  routes/                 pages, layout, global styles and theme tokens
  lib/
    components/ui/        shadcn-svelte components (our restyled copies)
    components/ai-elements/  chat components
    components/chat/      model picker
    components/shared/    header, logo, theme toggle
    components/landing/   landing page pieces
e2e/                      Playwright tests
```

Imports use the `#lib/...` subpath alias.

## Environment variables

Declared in `src/env.ts`. See `.env.example`.

| Variable                                                        | Purpose                                   |
| --------------------------------------------------------------- | ----------------------------------------- |
| `DATABASE_URL`                                                  | PostgreSQL connection string              |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                         | Session signing secret and public app URL |
| `ENCRYPTION_KEY`                                                | 32 bytes, base64. Encrypts saved AI keys  |
| `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`            | Optional sign-in providers                |
| `RESEND_API_KEY`, `EMAIL_FROM`                                  | Optional verification and reset emails    |
| `LIMIT_AI_PER_HOUR`, `LIMIT_PLANS_PER_USER`, `LIMIT_CHAT_CHARS` | Optional usage limits                     |

Losing `ENCRYPTION_KEY` makes saved AI keys unreadable, so back it up.
