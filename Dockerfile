ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/display/package.json packages/display/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/admin/ packages/admin/
COPY packages/display/ packages/display/
COPY packages/server/ packages/server/

RUN pnpm --filter @ha-external-dashboards/shared build && \
    pnpm --filter @ha-external-dashboards/admin build && \
    pnpm --filter @ha-external-dashboards/display build && \
    pnpm --filter @ha-external-dashboards/server build

FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/packages/admin/dist ./admin
COPY --from=builder /app/packages/display/dist ./display
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/node_modules ./server_modules
COPY --from=builder /app/packages/shared/dist ./shared

CMD ["node", "dist/index.js"]
