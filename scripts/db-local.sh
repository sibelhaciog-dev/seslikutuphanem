#!/usr/bin/env bash
# Yerel Postgres üzerinde şemayı kurar ve testleri çalıştırır.
#
#   npm run db:test          → sıfırdan kur + test et
#   npm run db:test -- keep  → konteyneri açık bırak (elle sorgu için)
#
# Supabase'in sağladığı auth/storage şemaları taklit edilir (scripts/supabase-stub.sql).
set -euo pipefail

CONTAINER="${SK_PG_CONTAINER:-sk-pg}"
IMAGE="postgres:16-alpine"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! docker info > /dev/null 2>&1; then
  echo "Docker çalışmıyor. Şema testleri için Docker gerekiyor." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "▸ Postgres konteyneri başlatılıyor…"
  docker rm -f "$CONTAINER" > /dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=pw "$IMAGE" > /dev/null
  for _ in $(seq 1 60); do
    docker exec "$CONTAINER" pg_isready -U postgres -h 127.0.0.1 > /dev/null 2>&1 && break
    sleep 0.5
  done
fi

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -q "$@"
}

echo "▸ Şema sıfırlanıyor…"
psql_run -c 'drop schema if exists public cascade; create schema public;' > /dev/null
psql_run -c 'drop schema if exists auth cascade; drop schema if exists storage cascade;' > /dev/null

psql_run < "$ROOT/scripts/supabase-stub.sql" > /dev/null

echo "▸ Migration'lar çalıştırılıyor…"
for file in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$file")"
  if psql_run < "$file" > /dev/null 2>"$ROOT/.db-error.log"; then
    echo "  ✓ $name"
  else
    echo "  ✗ $name"
    cat "$ROOT/.db-error.log" >&2
    rm -f "$ROOT/.db-error.log"
    exit 1
  fi
done
rm -f "$ROOT/.db-error.log"

if [ "${1:-}" = "schema-only" ]; then
  echo "▸ Şema hazır (test çalıştırılmadı)."
  exit 0
fi

echo "▸ Şema testleri…"
docker exec -i "$CONTAINER" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -q \
  < "$ROOT/supabase/tests/schema_test.sql" 2>&1 \
  | grep -E '✓|BAŞARISIZ|ERROR|──|GEÇTİ' \
  | sed 's/^psql:[^ ]* NOTICE:  //; s/^NOTICE:  //'

if [ "${1:-}" != "keep" ]; then
  docker rm -f "$CONTAINER" > /dev/null
  echo "▸ Konteyner kaldırıldı."
else
  echo "▸ Konteyner açık: docker exec -it $CONTAINER psql -U postgres -h 127.0.0.1"
fi
