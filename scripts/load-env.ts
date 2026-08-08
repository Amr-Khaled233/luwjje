import { loadEnvConfig } from '@next/env';

/**
 * Standalone scripts run outside `next dev` / `next build`, so nothing has
 * loaded .env for them. Import this first — before anything that touches
 * process.env — in every script under scripts/.
 */
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
