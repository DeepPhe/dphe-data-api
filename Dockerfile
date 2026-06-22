FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

# All dependencies are now pure-JS / WASM / built-in (node:sqlite, node:zlib),
# so no native build toolchain is needed.
COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3333 \
    DB_PATH=./test/resources/deepphe.sqlite3

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY src ./src
COPY test/resources ./test/resources

RUN chown -R node:node /app

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const http = require('http'); const port = process.env.PORT || 3333; const req = http.get({ host: '127.0.0.1', port, path: '/openapi.json', timeout: 4000 }, (res) => process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1)); req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', () => process.exit(1));"

CMD ["npm", "start"]
