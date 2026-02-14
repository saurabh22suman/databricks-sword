# syntax=docker/dockerfile:1

# ============================================
# Base Stage: Dependencies Installation
# ============================================
FROM node:22-alpine AS deps
LABEL stage=deps

# Install pnpm with specific version for reproducibility
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy only dependency files for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --prefer-offline

# ============================================
# Builder Stage: Application Build
# ============================================
FROM node:22-alpine AS builder
LABEL stage=builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Provide a valid placeholder DB URL for static page generation during build.
# The real Turso URL is injected at runtime via docker-compose env vars.
ENV TURSO_DATABASE_URL="file:/tmp/build.db"
# Mock auth flag — set via build arg for local testing
ARG MOCK_AUTH=""
ENV MOCK_AUTH=${MOCK_AUTH}

# Build the Next.js application
# Outputs to .next/standalone for optimized production
RUN pnpm build

# ============================================
# Runner Stage: Production Runtime
# ============================================
FROM node:22-alpine AS runner
LABEL stage=runner

WORKDIR /app

# Production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Python and pip for Databricks CLI
# The Databricks CLI is needed at runtime for deploying DAB bundles
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --no-cache-dir --break-system-packages databricks-cli

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Next.js standalone build (includes necessary node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port  
EXPOSE 3000

# Configure server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
