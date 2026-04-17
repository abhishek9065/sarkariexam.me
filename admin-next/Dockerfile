# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base

FROM base AS deps

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NEXT_PUBLIC_API_URL=/api
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Runtime stage
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3001/admin',(res)=>{res.resume();process.exit(res.statusCode>=200&&res.statusCode<400?0:1);});req.on('error',()=>process.exit(1));req.setTimeout(2000,()=>{req.destroy();process.exit(1);});"

CMD ["node", "server.js"]
