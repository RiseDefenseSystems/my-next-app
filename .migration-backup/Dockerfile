# =============================================================
# Base image strategy (all three stages target 0 known CVEs):
#
#  deps / builder  →  cgr.dev/chainguard/node:latest-dev
#                     Wolfi Linux, rebuilt daily, CVE-patched
#                     within hours of disclosure. Free tier.
#
#  runner          →  gcr.io/distroless/nodejs24-debian12:nonroot
#                     No shell, no pkg manager, no OS utils.
#                     Only the Node 24 runtime + nonroot user.
# =============================================================

# ─────────────────────────────────────────────
# Stage 1: deps — install production dependencies
# ─────────────────────────────────────────────
FROM cgr.dev/chainguard/node:latest-dev AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────
# Stage 2: builder — compile the Next.js app
# ─────────────────────────────────────────────
FROM cgr.dev/chainguard/node:latest-dev AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: runner — Google Distroless
#
# Contains ONLY the Node 24 runtime and a pre-created nonroot
# user (uid 65532). No shell, no apk/apt, no busybox, no openssl
# CLI — zero OS-level attack surface in the shipped image.
# ─────────────────────────────────────────────
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy only the self-contained standalone output from the builder.
# Next.js standalone bundles its own node_modules subset — no install needed.
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/.next/static    ./.next/static
COPY --from=builder --chown=65532:65532 /app/public          ./public

EXPOSE 3000

# Exec form required — distroless has no shell to parse string commands.
# The distroless entrypoint IS the node binary; server.js is the argument.
CMD ["server.js"]
