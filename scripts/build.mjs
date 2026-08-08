/**
 * Build entry point.
 *
 * Resolves the PostgreSQL connection string from whichever variable the host
 * injected it under, exports it as DATABASE_URL (which prisma/schema.prisma
 * reads), then runs generate → migrate deploy → next build.
 */
import { spawnSync } from 'node:child_process';
import nextEnv from '@next/env';
import { resolveDatabaseUrl } from './resolve-db-url.mjs';

// Load .env / .env.local the same way `next build` does, so a local build
// behaves identically to one on Vercel (where the vars are already exported).
// @next/env is CommonJS, hence the default import.
nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const { url, source } = resolveDatabaseUrl(process.env);

if (!url) {
  console.error(
    '\n✗ No PostgreSQL connection string found.\n' +
      '  Set DATABASE_URL in your environment (Vercel → Settings → Environment Variables).\n' +
      '  POSTGRES_URL, POSTGRES_PRISMA_URL and PRISMA_DATABASE_URL are also accepted.\n',
  );
  process.exit(1);
}

if (source !== 'DATABASE_URL') {
  console.log(`▸ Using ${source} as DATABASE_URL`);
}

const env = { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' };

const steps = [
  ['npx', ['prisma', 'generate']],
  ['npx', ['prisma', 'migrate', 'deploy']],
  ['npx', ['next', 'build']],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
