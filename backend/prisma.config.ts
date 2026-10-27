import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// desde Prisma 7 el CLI ya no carga .env solo, por eso el import de dotenv
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node src/database/seed.ts',
  },
  datasource: {
    // no se usa env() porque falla sin la variable y prisma generate (build de Docker y CI) no tiene BD
    url: process.env.DATABASE_URL ?? '',
  },
});
