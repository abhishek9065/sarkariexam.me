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

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

FROM deps AS prod-deps

WORKDIR /app

# Copy source code (Prisma schema required for generate)
COPY . .

# Generate Prisma Client BEFORE pruning dev dependencies
RUN npx prisma generate

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
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:4000/api/health',(res)=>{res.resume();process.exit(res.statusCode===200?0:1);});req.on('error',()=>process.exit(1));req.setTimeout(2000,()=>{req.destroy();process.exit(1);});"

# Start server (use npx --yes to prevent hanging if prisma is not locally installed due to pruning)
CMD ["sh", "-c", "npx --yes prisma migrate deploy && node dist/server.js"]
