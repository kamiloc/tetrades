# Build from the repository root so Yarn can resolve the API's workspace packages:
# docker build -f apps/api/Dockerfile -t athlete-api:local .

FROM node:22-bookworm-slim AS build

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable \
    && corepack prepare yarn@1.22.22 --activate

# The API build relies on packages/* workspaces and the root Prisma schema.
COPY . .

RUN yarn install --frozen-lockfile \
    && yarn workspace @app/api db:generate \
    && yarn turbo run build --filter='@app/api...'

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --create-home app

WORKDIR /app

ENV NODE_ENV=production \
    API_PORT=3001

# This initial image carries the installed workspace dependencies. The build
# stage has already generated Prisma Client for this same Debian/OpenSSL base.
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=app:app /app/apps/api/dist ./apps/api/dist

# Workspace package exports resolve through node_modules symlinks to these dirs.
COPY --from=build --chown=app:app /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=build --chown=app:app /app/packages/auth/dist ./packages/auth/dist
COPY --from=build --chown=app:app /app/packages/crypto/package.json ./packages/crypto/package.json
COPY --from=build --chown=app:app /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=build --chown=app:app /app/packages/queue/package.json ./packages/queue/package.json
COPY --from=build --chown=app:app /app/packages/queue/dist ./packages/queue/dist
COPY --from=build --chown=app:app /app/packages/shared-logic/package.json ./packages/shared-logic/package.json
COPY --from=build --chown=app:app /app/packages/shared-logic/dist ./packages/shared-logic/dist
COPY --from=build --chown=app:app /app/packages/validators/package.json ./packages/validators/package.json
COPY --from=build --chown=app:app /app/packages/validators/dist ./packages/validators/dist

EXPOSE 3001

USER app

CMD ["node", "apps/api/dist/server.js"]
