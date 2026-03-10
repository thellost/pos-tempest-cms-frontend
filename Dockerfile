# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy the build output and server entrypoints
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/serve.mjs ./serve.mjs

EXPOSE 3000

CMD ["node", "serve.mjs"]
