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

function run(command, args, options = {}) {
  return spawnSync(command, args, { stdio: 'inherit', env, shell: true, ...options });
}

function fail(result) {
  process.exit(result.status ?? 1);
}

const sleep = (ms) => {
  // Synchronous: the build is a straight line and has nothing else to do.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/** The host part of a connection string, for an error message worth reading. */
function hostOf(connection) {
  try {
    return new URL(connection).host;
  } catch {
    return 'the database';
  }
}

// ---------------------------------------------------------------- generate
{
  const result = run('npx', ['prisma', 'generate']);
  if (result.status !== 0) fail(result);
}

// ---------------------------------------------------------------- migrate
/**
 * `migrate deploy` refuses with P3005 when the database already has tables but
 * no migration history — which is the state of any database first created with
 * `db push`. The documented fix is to baseline: record the initial migration as
 * already applied, then carry on with the rest.
 *
 * Detecting it rather than baselining unconditionally matters — on a genuinely
 * empty database, marking 0_init applied without running it would leave the
 * schema missing and Prisma convinced everything was fine.
 */
{
  /**
   * P1001 is "cannot reach the database". A hosted Postgres that has been idle
   * can take a few seconds to accept its first connection, and a build machine
   * asking once and giving up turns that into a failed deploy — so ask again
   * before believing it.
   */
  const ATTEMPTS = 4;
  let result;
  let output = '';

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    result = run('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    if (result.status === 0 || !output.includes('P1001') || attempt === ATTEMPTS) break;

    const wait = attempt * 5000;
    console.log(
      `▸ ${hostOf(url)} did not answer (attempt ${attempt} of ${ATTEMPTS}) — waiting ${
        wait / 1000
      }s and trying again.`,
    );
    sleep(wait);
  }

  process.stdout.write(output);

  if (result.status !== 0) {
    if (output.includes('P1001')) {
      console.error(
        [
          '',
          `✗ Could not reach ${hostOf(url)} from the build.`,
          `  The connection string came from ${source}.`,
          '  Check that the database is awake, and that this value is the direct',
          '  postgres:// string from your database provider — an Accelerate URL',
          '  (prisma+postgres://) cannot be used to run migrations.',
          '',
        ].join('\n'),
      );
      fail(result);
    }
    if (!output.includes('P3005')) fail(result);

    console.log(
      '\n▸ Existing schema with no migration history — baselining 0_init and retrying.\n',
    );
    // Harmless if it is already recorded; the retry below is what must succeed.
    run('npx', ['prisma', 'migrate', 'resolve', '--applied', '0_init'], { stdio: 'inherit' });

    result = run('npx', ['prisma', 'migrate', 'deploy']);
    if (result.status !== 0) fail(result);
  }
}

// ---------------------------------------------------------------- build
{
  const result = run('npx', ['next', 'build']);
  if (result.status !== 0) fail(result);
}
