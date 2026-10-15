#!/bin/sh
set -eu

if [ -f prisma/schema.prisma ]; then
  pnpm exec prisma generate
  pnpm exec prisma migrate deploy
  pnpm db:seed
fi

exec pnpm dev
