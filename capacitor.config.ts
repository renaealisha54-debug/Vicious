import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: This app uses Next.js server actions (src/app/actions.ts) to call
// Groq, so the AI key/logic must run on a real Node server — it can't be
// baked into a static export like a normal Capacitor app. Instead this APK's
// WebView loads the Next.js server running locally on-device via Termux
// (npm run build && npm start), the same way you already run everything else.
// The APK is basically a WebView wrapper around http://localhost:9002 — the
// Termux server must be running for the app (including AI features) to work.
const config: CapacitorConfig = {
  appId: 'com.vicious.suite',
  appName: 'Vicious',
  webDir: 'public',
  server: {
    url: 'http://localhost:9002',
    cleartext: true,
  },
};

export default config;
