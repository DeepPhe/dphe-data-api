# DPHE Data API

A RESTful API for managing and accessing patient health data, including cancer information, demographics, documents, and clinical concepts. Built with Express.js and SQLite3.

## 🛠 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite3 (installed automatically with dependencies)

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dphe-data-api
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment configuration file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```bash
PORT=3000
DB_PATH=./data/deepphe/deepphe_sqlite_compressed
TEST_PATIENT_ID=your_test_patient_id_here
```

## 🗄️ Database Setup (SQLite3)

This project uses SQLite3 as an embedded database with a key-value store interface for high-performance data storage.

### Database Configuration

The database path is configured in `src/config/database.js` and can be overridden with the `DB_PATH` environment variable.

Default location: `./data/deepphe/deepphe_sqlite_compressed`

### Database Schema

The database uses a simple key-value structure with a `files` table:
- `filename` (TEXT PRIMARY KEY) - The document key/identifier
- `content` (TEXT) - JSON-encoded document data
- `encoding` (TEXT) - Encoding type ('raw' or 'zstd' for compressed content)

### Using the Database

The SQLite client provides automatic zstd decompression for compressed content:

```javascript
const { db } = require('./src/db');

// Store data
await db.put('key', { some: 'data' });

// Retrieve data (automatically decompresses if needed)
const data = await db.get('key');

// Query by prefix
const results = await db.getByPrefix('patient:PAT001:');

// Delete data
await db.del('key');

// Batch operations
await db.batch([
  { type: 'put', key: 'key1', value: { data: 'value1' } },
  { type: 'put', key: 'key2', value: { data: 'value2' } },
  { type: 'del', key: 'key3' }
]);
```

### Key Naming Conventions

The project uses the following key patterns:
- Documents: `{patientId}_*_Doc.json` or `{patientId}.json`
- All patient data uses numeric patient ID prefix for efficient querying

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Debug Mode
```bash
npm run start
```
This starts the server with Node.js inspector enabled on port 9229.

The server will start on `http://localhost:3000` (or the port specified in your environment variables).

## 📚 API Documentation

Once the server is running, access the interactive Swagger documentation at:

```
http://localhost:3000/api-docs
```

## 🔌 API Endpoints

### Documents

- **`GET /v1/dphe-data/patient/{patientId}/documents`**
  - Get all documents for a patient
  - Query Parameters:
    - `documentIds` (optional) - Comma-separated list of document IDs to filter by
    - `excludeProperties` (optional) - Comma-separated list of properties to exclude (e.g., `text,mentions,mentionRelations`)
  - Returns: Array of DocumentXn objects

### Patient Concepts

- `GET /v1/dphe-data/patient/concepts/` - Get all concepts for a patient
- `GET /v1/dphe-data/patient/conceptRelations/` - Get concept relations for a patient

### Cancer Data

- `GET /v1/dphe-data/patient/cancers` - Get all cancers for a patient
- `GET /v1/dphe-data/patient/cancer/attributes` - Get cancer attributes
- `GET /v1/dphe-data/patient/cancer/attribute/concepts` - Get cancer concepts
- `GET /v1/dphe-data/patient/cancer/attribute/mentions` - Get cancer mentions

### Demographics

- `GET /v1/dphe-data/patient/demographics` - Get patient demographics

### Cohort Filtering

- `GET /v1/dphe-data/cohort/filter/categories` - Get all filter categories
- `POST /v1/dphe-data/cohort/filter/categories/patients` - Get patients by categories

## 📖 API Examples

### Get All Documents for a Patient
```bash
curl http://localhost:3000/v1/dphe-data/patient/123456789/documents
```

### Get Specific Documents by ID
```bash
curl "http://localhost:3000/v1/dphe-data/patient/123456789/documents?documentIds=123456789_D_100,123456789_D_101"
```

### Get Documents Without Text Content
```bash
curl "http://localhost:3000/v1/dphe-data/patient/123456789/documents?excludeProperties=text"
```

### Get Documents Excluding Multiple Properties
```bash
curl "http://localhost:3000/v1/dphe-data/patient/123456789/documents?excludeProperties=text,mentions,mentionRelations"
```

### Combine Filters
```bash
curl "http://localhost:3000/v1/dphe-data/patient/123456789/documents?documentIds=123456789_D_100&excludeProperties=text,mentions"
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/db/sqlite-client.test.js
```

The test suite includes comprehensive tests for:
- SQLite database operations (PUT, GET, DELETE, batch operations)
- Document retrieval with filtering by document IDs
- Property exclusion functionality
- zstd decompression
- Error handling and edge cases

See [TESTING.md](./TESTING.md) for detailed testing information.

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the server with debugging enabled |
| `npm run dev` | Start the server in development mode with auto-reload (nodemon) |
| `npm run seed` | Seed the database with sample data |
| `npm run generate-schemas` | Generate TypeScript definitions from JSON schemas |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## 🏗️ Project Structure

```
dphe-data-api/
├── src/
│   ├── config/          # Configuration files (database path)
│   ├── controllers/     # Request handlers
│   ├── db/             # Database client and utilities
│   ├── docs/           # Swagger/OpenAPI documentation
│   ├── routes/         # API route definitions
│   ├── types/          # TypeScript type definitions
│   └── app.js          # Express app configuration
├── data/               # Database files (gitignored)
├── .env                # Environment variables (gitignored)
├── .env.example        # Environment variables template
├── server.js           # Server entry point
└── package.json        # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_PATH` - Path to SQLite database file
- `TEST_PATIENT_ID` - Patient ID used in tests (keep private)

### Database Path

The database path is centralized in `src/config/database.js`:

```javascript
const DB_PATH = process.env.DB_PATH || './data/deepphe/deepphe_sqlite_compressed';
```

To change the database location:
1. Edit `src/config/database.js`, OR
2. Set `DB_PATH` in your `.env` file

## 🎯 Key Features

- ✅ RESTful API design with Express.js
- ✅ SQLite3 database with key-value store interface
- ✅ Automatic zstd decompression for compressed data
- ✅ Flexible document filtering (by ID, exclude properties)
- ✅ Interactive Swagger API documentation
- ✅ Comprehensive test coverage with Jest
- ✅ TypeScript type definitions
- ✅ Centralized configuration management

## 🔐 Security Notes

⚠️ **Important:** Never commit the `.env` file to version control. It contains sensitive information like patient IDs and database paths.

The `.gitignore` file is configured to exclude:
- `.env`
- `.env.local`
- `.env.*.local`
- `data/` directory

Only `.env.example` should be committed as a template.

## 📞 Support

For issues and questions, please open an issue in the GitHub repository.

## 📄 Additional Documentation

- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference guide for common operations
- [TESTING.md](./TESTING.md) - Comprehensive testing guide

## 🚧 Development Notes

### Database Migration from RocksDB to SQLite3

This project was originally built with RocksDB and has been migrated to SQLite3. The client interface remains similar for backward compatibility.

### TypeScript Type Definitions

Type definitions are available in `src/types/` for all data structures including DocumentXn, Patient, Cancer, Concept, etc.

