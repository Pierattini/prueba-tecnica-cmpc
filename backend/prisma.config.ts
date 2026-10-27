import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// desde Prisma 7 el CLI ya no carga .env solo, por eso el import de dotenv
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node src/database/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
