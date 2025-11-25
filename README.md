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
DB_PATH=./data/deepphe/deepphe_db
TEST_PATIENT_ID=your_test_patient_id_here
```

## 🗄️ Database Setup (SQLite3)

This project uses SQLite3 as an embedded database with a key-value store interface for high-performance data storage.

### Database Configuration

The database path is configured in `src/config/database.js` and can be overridden with the `DB_PATH` environment variable.

Default location: `./data/deepphe/deepphe_db`

### Database Schema

The database uses a simple key-value structure with a `files` table:
- `filename` (TEXT PRIMARY KEY) - The document key/identifier
- `content` (TEXT) - JSON-encoded document data
- `encoding` (TEXT) - Encoding type ('raw' or 'zstd' for compressed content)


### Naming Conventions
- Document Keys: `{patientId}_D_{documentId}.json` (e.g., `123456789_D_100.json`)
- Patient Keys: `{patientId}` (e.g., `123456789.json`)
- Cancer Keys: `{patientId}_Cancers.json` (e.g., `123456789_Cancers.json`)
- Concept Keys: `{patientId}_Concepts.json}` (e.g., `123456789_Concepts.json`)

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

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the server with debugging enabled |
| `npm run dev` | Start the server in development mode with auto-reload (nodemon) |
| `npm run generate-schemas` | Generate TypeScript definitions from JSON schemas |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_PATH` - Path to SQLite database file
- `TEST_PATIENT_ID` - Patient ID used in tests (keep private)

### Database Path

The database path is centralized in `src/config/database.js`:

```javascript
const DB_PATH = process.env.DB_PATH || './data/deepphe/deepphe_db';
```

To change the database location:
1. Edit `src/config/database.js`, OR
2. Set `DB_PATH` in your `.env` file

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

### TypeScript Type Definitions

Type definitions are available in `src/types/` for all data structures including DocumentXn, Patient, Cancer, Concept, etc.

