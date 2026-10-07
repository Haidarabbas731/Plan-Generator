#!/bin/sh
set -e

echo "==> Running database migrations..."
if ! node scripts/migrate.mjs; then
    echo "==> ERROR: Migrations failed. Check DATABASE_URL is set correctly."
    echo "==> DATABASE_URL host: $(echo "$DATABASE_URL" | sed 's/.*@//' | cut -d'/' -f1)"
    exit 1
fi

echo "==> Starting server on port ${PORT:-3000}..."
exec node build
