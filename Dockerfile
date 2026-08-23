# ─────────────────────────────────────────────
# Stage 1: deps — install production dependencies
# ─────────────────────────────────────────────
# Pin to a specific digest or patch version and apply latest OS patches
# to minimise CVE exposure in ephemeral build stages.
FROM node:24-alpine AS deps
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────
# Stage 2: builder — compile the Next.js app
# ─────────────────────────────────────────────
FROM node:24-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: runner — Google Distroless (no shell, no apk, no busybox)
#
# gcr.io/distroless/nodejs24-debian12:nonroot contains ONLY:
#   • the Node.js 24 runtime
#   • a pre-created non-root user (uid 65532, "nonroot")
#   • no shell, no package manager, no OS utilities
#
# This eliminates the entire Alpine/musl/busybox/openssl CVE surface
# that caused the 1 critical + 7 high warnings on the previous image.
# ─────────────────────────────────────────────
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# distroless:nonroot already runs as uid 65532 — no adduser needed.
# Copy only the self-contained standalone output from the builder stage.
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/.next/static    ./.next/static
COPY --from=builder --chown=65532:65532 /app/public          ./public

EXPOSE 3000

# Distroless has no shell, so CMD must be in exec form.
# The entrypoint is the Node.js binary; we just pass the script path.
CMD ["server.js"]
