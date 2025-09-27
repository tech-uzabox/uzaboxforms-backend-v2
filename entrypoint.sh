#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy

# Start NestJS app
node -r tsconfig-paths/register dist/src/main.js
