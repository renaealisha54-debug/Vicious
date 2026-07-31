import type { CapacitorConfig } from '@capacitor/cli';

// Fully standalone: Groq is called directly from the app's own JS (see
// src/lib/ai.ts), so this is a normal static Capacitor bundle — no local
// server needs to be running. webDir points at Next's static export output.
const config: CapacitorConfig = {
  appId: 'com.vicious.suite',
  appName: 'Vicious',
  webDir: 'out',
};

export default config;
