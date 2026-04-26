# Stage 1: Install Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# SQLite ve Binary build araclari
RUN apk add --no-cache python3 make g++ sqlite

# Bagimliliklari kopyala ve yukle (npm install)
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js Telemetry kapali
ENV NEXT_TELEMETRY_DISABLED 1

# Uygulamayi derle (Standalone mode varsayilan)
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Runner icin sadece SQL-lite gerekli
RUN apk add --no-cache sqlite

# Standalone ciktilarini kopyala
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

# Veri dizini olustur
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 3007
ENV PORT 3007
ENV HOSTNAME "0.0.0.0"

# server.js baslaticisi
CMD ["node", "server.js"]
