# Build from the repository root so Yarn can resolve all workspace packages:
# docker build -f apps/web/Dockerfile -t athlete-web:local \
#   --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/trpc \
#   --build-arg NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
#   --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key> .

FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN corepack enable \
    && corepack prepare yarn@1.22.22 --activate

COPY . .

# These public values are embedded in the browser bundle by Next.js at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN test -n "$NEXT_PUBLIC_API_URL" \
    && test -n "$NEXT_PUBLIC_SUPABASE_URL" \
    && test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY"

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN yarn install --frozen-lockfile \
    && yarn turbo run build --filter='@app/web...'

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --create-home app

# Next standalone preserves the monorepo path apps/web/server.js because
# outputFileTracingRoot is the repository root.
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static

WORKDIR /app/apps/web

EXPOSE 3000

USER app

CMD ["node", "server.js"]
