/**
 * Vercel's storage integrations each inject a differently-named connection
 * string: Vercel Postgres sets POSTGRES_URL, the Prisma Postgres integration
 * sets PRISMA_DATABASE_URL, Neon sets DATABASE_URL. Accept any of them so a
 * deploy does not fail purely over naming.
 *
 * DATABASE_URL always wins when present.
 */
const CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
] as const;

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  for (const key of CANDIDATES) {
    const value = env[key];
    // Prisma Accelerate URLs (prisma://, prisma+postgres://) need the
    // Accelerate extension, which this app does not use — skip them so we
    // fall through to a plain postgres:// string if one exists.
    if (value && /^postgres(ql)?:\/\//.test(value)) return { url: value, source: key };
  }
  return { url: undefined, source: undefined };
}
