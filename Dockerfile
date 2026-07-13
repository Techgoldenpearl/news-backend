# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# node-gyp needs these to compile canvas' native bindings on Alpine (musl)
RUN apk add --no-cache python3 make g++ pkgconfig cairo-dev jpeg-dev pango-dev giflib-dev

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime shared libs canvas' compiled addon links against
RUN apk add --no-cache cairo jpeg pango giflib

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle/migrations ./drizzle/migrations

EXPOSE 5000

CMD ["node", "dist/src/index.js"]
