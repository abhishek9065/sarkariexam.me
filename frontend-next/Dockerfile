# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production (static export to /app/out)
RUN npm run build

# Production stage - serve with nginx (identical to Vite frontend)
FROM nginx:alpine AS production

# Copy built static files to nginx
COPY --from=builder /app/out /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
