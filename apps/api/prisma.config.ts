import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `prisma generate` doesn't need a database, so DATABASE_URL is only required by
// commands that connect (migrate, studio). Those fail with Prisma's own error without it.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
