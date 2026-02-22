# Development ve Production build: multi-stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Husky ve diğer prepare script'leri Docker build'de çalışmasın
ENV HUSKY=0
ENV CI=1
RUN npm ci --ignore-scripts

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development
ENV PORT=3000
# Veritabanı için dizin (volume ile mount edilir)
RUN mkdir -p /app/data
COPY docker/app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Development'ta sorun olmasın diye kütüphaneleri yüklü tut
RUN npm install 2>/dev/null || true
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "dev:simple"]
