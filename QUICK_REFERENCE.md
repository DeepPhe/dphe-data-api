# DPHE Data API - Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database path and test patient ID

# Start development server
npm run dev

# Run tests
npm test
```

## 📍 API Endpoints

### Documents API

**Get all documents for a patient:**
```bash
GET /v1/dphe-data/patient/{patientId}/documents
```

**Query Parameters:**
- `documentIds` - Comma-separated list of document IDs to filter by
- `excludeProperties` - Comma-separated list of properties to exclude

**Examples:**
```bash
# Get all documents
GET /v1/dphe-data/patient/123456789/documents

# Get specific documents
GET /v1/dphe-data/patient/123456789/documents?documentIds=123456789_D_100,123456789_D_101

# Exclude text content
GET /v1/dphe-data/patient/123456789/documents?excludeProperties=text

# Exclude multiple properties
GET /v1/dphe-data/patient/123456789/documents?excludeProperties=text,mentions,mentionRelations

# Combine filters
GET /v1/dphe-data/patient/123456789/documents?documentIds=123456789_D_100&excludeProperties=text
```

**Valid properties for exclusion:**
- `id`, `name`, `type`, `date`, `episode`, `text`, `mentions`, `mentionRelations`, `sections`

## 💾 Database Operations

### Using the SQLite Client

```javascript
const { db } = require('./src/db');

// Open database
await db.open();

// Store data
await db.put('key', { some: 'data' });

// Retrieve data (auto-decompresses zstd)
const data = await db.get('key');

// Get by prefix
const results = await db.getByPrefix('123456789');

// Delete
await db.del('key');

// Batch operations
await db.batch([
  { type: 'put', key: 'key1', value: { data: 'value1' } },
  { type: 'del', key: 'key2' }
]);

// Get all (with limit)
const all = await db.getAll(1000);

// Check existence
const exists = await db.exists('key');

// Clear all data (use with caution!)
await db.clear();

// Close database
await db.close();
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/db/sqlite-client.test.js

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file:
```bash
PORT=3000
DB_PATH=./data/deepphe/deepphe_sqlite_compressed
TEST_PATIENT_ID=your_test_patient_id_here
```

### Database Path Configuration

The database path is centralized in `src/config/database.js`:

```javascript
const DB_PATH = process.env.DB_PATH || './data/deepphe/deepphe_sqlite_compressed';
```

**To change the database path:**
1. Set `DB_PATH` in `.env` file, OR
2. Edit `src/config/database.js`

All files automatically use the configured path.

## 📁 File Locations

- **Config:** `src/config/database.js` - Database path constant
- **Client:** `src/db/sqlite-client.js` - SQLite3 implementation
- **Init:** `src/db/index.js` - Database initialization
- **Seed:** `src/db/seed.js` - Sample data seeding
- **Tests:** `src/db/sqlite-client.test.js` - Test suite
- **Data:** `./data/deepphe/deepphe_sqlite_compressed` - Database file (gitignored)

## 🏗️ Project Structure

```
src/
├── config/database.js        # Database configuration
├── controllers/              # Request handlers
│   ├── patient-document-controller.js
│   ├── patient-cancer-controller.js
│   └── ...
├── db/                       # Database layer
│   ├── sqlite-client.js     # SQLite client
│   ├── index.js             # Database initialization
│   └── sqlite-client.test.js
├── routes/                   # API routes
│   ├── patient-document-routes.js
│   └── ...
└── types/                    # TypeScript definitions
    ├── DocumentXn.d.ts
    └── ...
```

## 🔧 Common Operations

### Get Documents for a Patient

```javascript
const { getDocuments } = require('./src/controllers/patient-document-controller');

// Mock Express req/res
const req = {
  params: { patientId: '123456789' },
  query: {}
};

const res = {
  json: (data) => console.log(data),
  status: (code) => ({ json: (data) => console.log(code, data) })
};

await getDocuments(req, res);
```

### Filter Documents

```javascript
// Get specific documents
const req = {
  params: { patientId: '123456789' },
  query: { 
    documentIds: '123456789_D_100,123456789_D_101'
  }
};

// Exclude properties
const req = {
  params: { patientId: '123456789' },
  query: { 
    excludeProperties: 'text,mentions'
  }
};
```

## 📊 Database Schema

### Files Table
```sql
CREATE TABLE files (
  filename TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  encoding TEXT  -- 'raw' or 'zstd'
)
```

The SQLite client automatically handles zstd decompression when reading data.

## 🎯 Key Features

- ✅ RESTful API with URL path parameters
- ✅ Flexible document filtering (by ID, exclude properties)
- ✅ Automatic zstd decompression
- ✅ Centralized configuration
- ✅ Comprehensive test coverage
- ✅ Interactive Swagger documentation at `/api-docs`

## 🔐 Security

⚠️ **Never commit `.env` file** - It contains sensitive patient IDs and database paths.

The `.gitignore` already excludes:
- `.env`
- `data/` directory

## 📜 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start server with debugging |
| `npm run dev` | Development mode with auto-reload |
| `npm test` | Run all tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage report |
| `npm run seed` | Seed database with sample data |

## 🌐 API Documentation

Interactive Swagger UI available at:
```
http://localhost:3000/api-docs
```

## 💡 Tips

1. **Database Path:** Centralized in one file - easy to change
2. **Tests:** Use real database with test patient ID from `.env`
3. **Compression:** zstd decompression is automatic and transparent
4. **Filtering:** Combine `documentIds` and `excludeProperties` for precise queries
5. **Type Safety:** TypeScript definitions available in `src/types/`

## 📚 More Info

- 📖 Full Documentation: [README.md](./README.md)
- 🧪 Testing Guide: [TESTING.md](./TESTING.md)
- 📡 Swagger UI: `http://localhost:3000/api-docs`

## 🆘 Troubleshooting

### Database not found
- Check `DB_PATH` in `.env`
- Verify database file exists at specified path

### Tests failing
- Ensure `TEST_PATIENT_ID` is set in `.env`
- Verify test patient exists in database

### Port already in use
- Change `PORT` in `.env`
- Kill process using port 3000: `lsof -ti:3000 | xargs kill`

### Decompression errors
- Ensure `@mongodb-js/zstd` package is installed: `npm install @mongodb-js/zstd`

