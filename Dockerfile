# ===================================
# Multi-stage build for BRK Backend
# ===================================

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --no-audit --no-fund

# ===================================
# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code and configuration files
COPY package*.json ./
COPY tsconfig.json ./
COPY typeorm-migration.config.ts ./
COPY typeorm.config.ts ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Verify build output
RUN if [ ! -f "dist/index.js" ]; then \
      echo "ERROR: Build failed - dist/index.js not found!" && \
      ls -la dist && \
      exit 1; \
    fi

# ===================================
# Stage 3: Production Dependencies
FROM node:20-alpine AS prod-dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# ===================================
# Stage 4: Production
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NPM_CONFIG_LOGLEVEL=error

# Copy production dependencies
COPY --from=prod-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy necessary runtime files
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --chown=nodejs:nodejs src/templates ./src/templates

# Copy TypeORM configuration files for migrations
COPY --chown=nodejs:nodejs typeorm-migration.config.ts ./
COPY --chown=nodejs:nodejs typeorm.config.ts ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"] 