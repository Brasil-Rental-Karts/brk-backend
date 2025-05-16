FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and necessary files
COPY src/ ./src/
COPY tsconfig.json ./
COPY typeorm-migration.config.ts ./
COPY typeorm.config.ts ./

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist
RUN ls -la dist/index.js || (echo "ERROR: dist/index.js not found!" && exit 1)

# Production stage
FROM node:20-alpine

WORKDIR /app

# Set node environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Copy template files
COPY src/templates ./src/templates

# Print directory contents to debug
RUN ls -la /app
RUN ls -la /app/dist || echo "dist directory not found"
RUN ls -la /app/dist/index.js || echo "index.js not found"

# Expose the port
EXPOSE 3000

# Start the application with health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 CMD wget --no-verbose --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"] 