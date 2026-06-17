FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

# Native dependencies such as sqlite3/roaring may compile during npm install.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3333 \
    DB_PATH=./data/deepphe/deepphe_sqlite_compressed

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY src ./src

RUN mkdir -p /app/data \
    && chown -R node:node /app

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const http = require('http'); const port = process.env.PORT || 3333; const req = http.get({ host: '127.0.0.1', port, path: '/openapi.json', timeout: 4000 }, (res) => process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1)); req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', () => process.exit(1));"

CMD ["npm", "start"]
