# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only the build output and server entrypoints
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/instrument.server.mjs ./instrument.server.mjs
COPY --from=builder /app/serve.mjs ./serve.mjs

EXPOSE 3000

CMD ["node", "serve.mjs"]
