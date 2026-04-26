FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV WORKER_COMMAND="node -e \"console.log('Set WORKER_COMMAND to run a job')\""

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY scripts ./scripts
COPY lib ./lib
COPY supabase ./supabase

CMD ["sh", "-c", "$WORKER_COMMAND"]
