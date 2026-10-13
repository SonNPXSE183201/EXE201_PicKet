# syntax=docker/dockerfile:1
FROM node:22.20.0-alpine AS dependencies

WORKDIR /workspace
COPY packages ./packages
COPY web/package.json web/package-lock.json ./web/
RUN npm ci --prefix web

FROM node:22.20.0-alpine AS build

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

WORKDIR /workspace
COPY --from=dependencies /workspace/web/node_modules ./web/node_modules
COPY packages ./packages
COPY web ./web
RUN npm run build --prefix web

FROM node:22.20.0-alpine AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /workspace/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /workspace/web/.next/static ./web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "web/server.js"]
