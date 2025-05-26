# Build stage
FROM node:18-alpine AS builder

# Install Python and build dependencies
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Production stage
FROM node:18-alpine

# Install Python and runtime dependencies
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=appuser:appgroup /app .

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 2525 3000

# Start the application
CMD ["node", "src/index.js"] 