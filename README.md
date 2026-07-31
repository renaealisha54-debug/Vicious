# Vicious

The four Vicious Series apps merged into one Next.js app: **Offline**, **Archi**,
**Spark**, and **Script**, each as a tab. One shared AI backend (Groq) powers
every tab's AI features through a single API key.

## What changed in the merge

- **One app, one shell.** `src/app/page.tsx` renders the "Vicious" header and a
  tab bar. Each original app's UI lives in `src/components/apps/*App.tsx` and
  all four stay mounted (just hidden) so switching tabs doesn't lose your work.
- **One AI provider, one key, fully standalone.** All four apps previously used
  a mix of providers (Gemini via Genkit, Gemini via raw REST, Groq via Genkit).
  They now all call `src/lib/ai.ts`, a single client-side module that talks
  directly to `api.groq.com` from the app itself — no server involved at
  runtime. The key is set via `NEXT_PUBLIC_GROQ_API_KEY` and gets baked into
  the static JS bundle at build time.

  **Tradeoff, on purpose:** because the key ships inside the app, anyone who
  unpacks the APK can extract it. This was chosen over the alternatives
  (running a local Termux server the app depends on, or standing up a remote
  backend) to make the APK fully standalone — no background process needed
  to use it. If that key ever leaks or gets abused, rotate it at
  console.groq.com/keys.
- **One design system.** All four tabs share the dark theme/tokens from
  `src/app/globals.css` and the shadcn-style primitives in
  `src/components/ui/`, so the app looks consistent instead of switching
  themes per tab. Each tab keeps a small colored dot in the tab bar as its
  only visual "signature," plus a refresh button that resets that tab back
  to its default state.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set NEXT_PUBLIC_GROQ_API_KEY (https://console.groq.com/keys)
npm run dev
```

Runs on http://localhost:9002. `npm run build` produces a static export in
`out/`; `npm start` serves that `out/` folder locally for preview (it's a
plain static file server, not a real backend — same thing the APK does).

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

`capacitor.config.ts` builds a standalone static bundle (`webDir: 'out'`) —
no server needed at runtime. Build with:

```bash
npm install
cp .env.example .env   # set NEXT_PUBLIC_GROQ_API_KEY first — it's baked in at build time
bash build-android.sh
```

That script runs `npm run build` (static export), `npx cap add android` /
`npx cap sync`, patches `compileSdk`/`targetSdk` to 34 (Termux's aapt2 can't
handle 35+), and builds the debug APK via gradle. Output:
`android/app/build/outputs/apk/debug/app-debug.apk`. Note: Capacitor is
pinned to `^6.2.1` — 8.x pulls in androidx.core deps that require
compileSdk 35/36, which breaks Termux's aapt2.
