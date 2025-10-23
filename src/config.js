// Detect native Capacitor runtime and set API base for the AI endpoint
export const IS_NATIVE =
  typeof window !== 'undefined' &&
  window.location &&
  window.location.protocol === 'capacitor:';

// IMPORTANT: replace with your deployed domain so AI works inside the Android app
// Example: 'https://tricinty.vercel.app'
export const API_BASE = IS_NATIVE ? 'https://YOUR-VERCEL-APP.vercel.app' : '';
