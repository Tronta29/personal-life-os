# Personal Life OS

An AI-powered personal life management app. It brings tasks, daily routines, projects, finances, goals and habits into one place, and uses Google Gemini as a built-in assistant.

Built as a single-user Progressive Web App (PWA) with Next.js and deployed on Vercel.

## What it does

- **AI assistant (Gemini 2.5 Flash):** type a plain-language command such as "spent 250 TL on groceries, add a task to call the bank tomorrow" and the app turns it into finance entries and tasks.
- **AI daily summary and weekly score:** scheduled jobs write a summary of the day and give the week a score.
- **AI note organiser:** suggests folders for quick notes and applies them.
- **Tasks and projects:** task states, Pomodoro timer, project progress and spending.
- **Routines:** switchable routine profiles (Normal, Thesis Mode, Exam Week).
- **Finance:** income and expenses, monthly summary, category chart, budget alerts, subscriptions, instalments and payment methods.
- **Goals and habits:** numeric, yes/no and date goals; habit streaks.
- **Works offline:** installable PWA with a custom service worker.

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API routes, Prisma 6 |
| Database | PostgreSQL on Neon (serverless) |
| AI | Google Gemini 2.5 Flash via the `@google/genai` SDK |
| Auth | Single-user login with an HMAC-SHA256 signed cookie (Web Crypto) |
| Deploy | Vercel with GitHub auto-deploy and Vercel Cron jobs |

## How the AI part works

1. The user writes a command in natural language.
2. The `/api/ai/parse` endpoint sends it to Gemini and asks for structured JSON.
3. The app validates the JSON and creates the matching finance records and tasks in the database.
4. Cron jobs call `/api/ai/daily-summary` and `/api/ai/weekly-score` on a schedule; these endpoints are protected with a secret token.

## Engineering notes

- Charts are drawn with custom SVG, with no chart library.
- The PWA layer is written by hand because `next-pwa` is not compatible with Next.js 16 and Turbopack.
- Dates are handled in local time to avoid UTC shift bugs.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in Neon, Gemini and auth values
npm run db:push    # apply the schema to Neon
npm run db:seed    # add starter data
npm run dev
```

Setup details (in Turkish): [KURULUM.md](KURULUM.md).

## Author

Derviş Toraman · [github.com/Tronta29](https://github.com/Tronta29) · toramand9@gmail.com
