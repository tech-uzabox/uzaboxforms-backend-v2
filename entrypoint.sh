#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy

# Start NestJS app
node dist/src/main.js
