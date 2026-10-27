#!/bin/sh
set -e

echo "Aplicando migraciones..."
npx prisma migrate deploy

# el seed es idempotente, se puede correr en cada arranque
if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "Ejecutando seed..."
  node dist/database/seed.js
fi

exec node dist/main.js
