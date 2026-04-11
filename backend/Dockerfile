# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base

FROM base AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies once and reuse them across stages
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

FROM deps AS prod-deps

WORKDIR /app

RUN npm prune --omit=dev && npm cache clean --force

# Production stage
FROM base AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package*.json ./

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.json ./openapi.json

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start server
CMD ["node", "dist/server.js"]
