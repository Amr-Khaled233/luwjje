import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './database-url';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Passed explicitly so the app works whichever name the host injected the
// connection string under; the schema's env("DATABASE_URL") is only the default.
const { url } = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
