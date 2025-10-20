# Dockerfile untuk Railway Deployment
# Multi-stage build untuk optimasi ukuran image

# Stage 1: Base image
FROM node:20-slim AS base

# Install dependencies yang diperlukan
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Copy semua source code SEBELUM npm install
# Ini penting agar postinstall script bisa menemukan scripts/init-db.js
COPY . .

# Install production dependencies
# postinstall akan jalan di sini dan sudah bisa akses scripts/init-db.js
RUN npm ci --omit=dev && \
    npm cache clean --force

# Stage 3: Production
FROM node:20-slim AS production

# Install curl untuk health checks
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user untuk security
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nodejs

# Set working directory
WORKDIR /app

# Copy node_modules dari stage dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create uploads directory untuk file uploads
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port (Railway akan set PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start application
# Jalankan db:init dulu, lalu start server
CMD ["npm", "run", "railway:start"]
