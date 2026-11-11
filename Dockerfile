FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

# Runtime dependencies are pure JS, WASM, or Node built-ins, so no native
# build toolchain is needed.
COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3333 \
    DATABASE_URL=postgresql://dphe:dphe@host.docker.internal:55432/dphe

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY src ./src

RUN chown -R node:node /app

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const http = require('http'); const port = process.env.PORT || 3333; const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 4000 }, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', () => process.exit(1));"

CMD ["npm", "start"]
