# Vicious

The four Vicious Series apps merged into one Next.js app: **Offline**, **Archi**,
**Spark**, and **Script**, each as a tab. One shared AI backend (Groq) powers
every tab's AI features through a single API key.

## What changed in the merge

- **One app, one shell.** `src/app/page.tsx` renders the "Vicious" header and a
  tab bar. Each original app's UI lives in `src/components/apps/*App.tsx` and
  all four stay mounted (just hidden) so switching tabs doesn't lose your work.
- **One AI provider, one key.** All four apps previously used a mix of
  providers (Gemini via Genkit, Gemini via raw REST, Groq via Genkit). They now
  all call `src/lib/groq.ts`, a single server-only client that reads one
  `GROQ_API_KEY` (see `.env.example`). The old Genkit flow files and the
  separate Cloudflare Worker proxy are gone — everything is a Next.js server
  action in `src/app/actions.ts`.
- **One design system.** All four tabs share the dark theme/tokens from
  `src/app/globals.css` and the shadcn-style primitives in
  `src/components/ui/`, so the app looks consistent instead of switching
  themes per tab. Each tab keeps a small colored dot in the tab bar as its
  only visual "signature."

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set GROQ_API_KEY (https://console.groq.com/keys)
npm run dev
```

Runs on http://localhost:9002.

## ⚠️ Important: rotate your Groq key

`vicious-archi-master/.env.example` in your original upload had a real-looking
Groq key committed to it, not a placeholder. That file is not carried into
this merge, but if that key is live, treat it as compromised — rotate/revoke
it at https://console.groq.com/keys and put the new one only in your local
`.env` (already gitignored here), never in a committed `.env.example`.

## Tabs

| Tab | What it does |
|---|---|
| **Offline** | Local-first text workspace. Summarize, explain, or detect the language of your text/code via Groq. Drafts autosave to `localStorage`. |
| **Archi** | Paste a monolith code blob, dissect it into a file tree, detect framework/deps, synthesize a README via Groq, export as a ZIP. |
| **Spark** | Live HTML/CSS editor with instant iframe preview, a project vault in `localStorage`, and a Groq-powered "describe it, get the markup" generator. |
| **Script** | Sandboxed JS runner (Web Worker, 10s watchdog), live console stream, plus Groq-powered error interpreter, code generator, and title suggester. |

## Note on Script and Spark

Your uploaded `Vicious-script-main.zip` and `Vicious-spark--main.zip` only
contained root config/docs/AI-flow files — no `src/app` or `src/components`
directories, so there was no existing page UI to port for those two. Their
tabs here were rebuilt from scratch to match what their own READMEs describe
(Web Worker script runner with console stream / live HTML+CSS editor with
preview and vault). If your real versions differ, drop the original
`src/app/page.tsx` (and any components) into
`src/components/apps/ScriptApp.tsx` / `SparkApp.tsx` and swap their AI calls
to use `src/app/actions.ts` instead of the old Genkit/Gemini calls.

## Android (Capacitor)

`capacitor.config.ts` is set up (`appId: com.vicious.suite`), and the
Capacitor deps are in `package.json`, but no native `android/` project is
generated yet — the four source zips each had a *different* Capacitor
android project (different package names), and merging those isn't
meaningful. Once you're happy with the web app:

```bash
npm run build
npx cap add android
npm run cap:sync
```

Then follow your usual Termux build flow (`local.properties`, `JAVA_HOME`,
etc.) against the new `android/` folder.
