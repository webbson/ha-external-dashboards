# syntax=docker/dockerfile:1.7
#
# External Dashboards — Home Assistant add-on image.
#
# Builder uses node:24-alpine + pnpm to compile the monorepo (shared → admin
# → display → server). The server is bundled via `pnpm deploy` which resolves
# workspace refs to real directories and drops devDependencies, producing a
# self-contained tree with a flat node_modules that plain `node` can resolve
# (no pnpm symlinks at runtime).
#
# Runtime is the same node:24-alpine image — Node 24 is the current LTS and
# we don't need HA's base-image extras (we use `init: false` in config.yaml
# and don't rely on s6-overlay or bashio). Multi-arch is handled by Docker
# Buildx / docker/build-push-action, not home-assistant/builder, because the
# build context needs the monorepo root.

FROM node:24-alpine AS builder

# better-sqlite3 and bcrypt ship prebuilt binaries for common Node versions
# but may fall back to compiling from source (e.g. Node 24 prebuild lag).
# Keep the toolchain available in the builder so that fallback succeeds.
# These packages are not carried into the runtime image — only the
# compiled .node binaries end up in the pnpm deploy output.
RUN apk add --no-cache python3 make g++ libc6-compat

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

# pnpm deploy resolves workspace:* to real files and installs only prod
# deps into /deploy/node_modules. It honours .gitignore, which excludes
# dist/, so we copy the server's dist back in explicitly afterwards.
RUN pnpm deploy --legacy --filter=@ha-external-dashboards/server --prod /deploy && \
    cp -r packages/server/dist /deploy/dist


FROM node:24-alpine

WORKDIR /app

# Self-contained server bundle: package.json + node_modules + dist.
COPY --from=builder /deploy/ ./

# Static SPA bundles served by the server.
COPY --from=builder /app/packages/admin/dist ./admin
COPY --from=builder /app/packages/display/dist ./display

# Drizzle migrations (run at server boot via migrate.ts).
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/ha/status').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
