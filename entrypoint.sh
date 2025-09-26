#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy

# Optionally seed
npx prisma db seed

# Start NestJS app
node dist/src/main.js
