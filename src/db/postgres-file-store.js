const zlib = require('node:zlib');
const lz4 = require('lz4js');
const { all, assertDatabaseOpen, get } = require('./postgres-operations');

function normalizeString(value) {
  return String(value ?? '').trim();
}

async function decodeContent(content, encoding) {
  const normalizedEncoding = normalizeString(encoding || 'raw').toLowerCase();
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content || '');

  if (normalizedEncoding === 'raw' || normalizedEncoding === '') {
    return buffer.toString('utf8');
  }

  if (normalizedEncoding === 'zstd') {
    return zlib.zstdDecompressSync(buffer).toString('utf8');
  }

  if (normalizedEncoding === 'lz4') {
    return Buffer.from(lz4.decompress(new Uint8Array(buffer))).toString('utf8');
  }

  throw new Error(`Unsupported file content encoding: ${encoding}`);
}

function parseContent(content) {
  if (!content) {
    return content;
  }

  try {
    return JSON.parse(content);
  } catch (_) {
    return content;
  }
}

class PostgresFileStore {
  constructor(client) {
    this.client = client;
  }

  async get(key, parseJson = true) {
    const row = await get(
      this.client,
      'SELECT content, encoding FROM deepphe.files WHERE filename = $1',
      [key],
    );
    if (!row) {
      return null;
    }

    const content = await decodeContent(row.content, row.encoding);
    return parseJson ? parseContent(content) : content;
  }

  async getByPrefix(prefix) {
    assertDatabaseOpen(this.client);

    const normalizedPrefix = normalizeString(prefix);
    if (!normalizedPrefix) {
      return [];
    }

    const rows = await all(
      this.client,
      `SELECT filename, content, encoding
       FROM deepphe.files
       WHERE starts_with(filename, $1)
       ORDER BY filename`,
      [normalizedPrefix],
    );

    return Promise.all(rows.map((row) => this.processRow(row)));
  }

  async processRow(row) {
    const content = await decodeContent(row.content, row.encoding);
    return {
      key: row.filename,
      value: parseContent(content),
    };
  }
}

module.exports = {
  PostgresFileStore,
  decodeContent,
};
