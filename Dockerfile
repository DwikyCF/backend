# Dockerfile untuk Railway Deployment
# Multi-stage build untuk optimasi ukuran image

# Stage 1: Base image
FROM node:18-alpine AS base

# Install dependencies yang diperlukan
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Stage 2: Dependencies
FROM base AS dependencies

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 3: Build
FROM base AS build

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Stage 4: Production
FROM node:18-alpine AS production

# Install curl untuk health checks
RUN apk add --no-cache curl

# Create non-root user untuk security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from dependencies stage
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
# Railway akan menjalankan database initialization otomatis via postinstall script
CMD ["npm", "start"]
