/**
 * Plain-JS twin of src/lib/database-url.ts, so the build script can run before
 * any TypeScript tooling is available. Keep the candidate list in sync.
 */
const CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
];

export function resolveDatabaseUrl(env = process.env) {
  for (const key of CANDIDATES) {
    const value = env[key];
    // Skip prisma:// Accelerate URLs — this app talks plain PostgreSQL.
    if (value && /^postgres(ql)?:\/\//.test(value)) return { url: value, source: key };
  }
  return { url: undefined, source: undefined };
}
