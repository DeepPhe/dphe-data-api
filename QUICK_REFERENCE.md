# SQLite3 Quick Reference

## Installation
```bash
npm install  # SQLite3 is already in package.json
```

## Basic Commands

### Start Server
```bash
npm start        # Production
npm run dev      # Development (with auto-reload)
```

### Database Operations
```bash
npm run seed     # Seed with sample data
```

### Testing
```bash
npm test                # Run tests once
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

## Code Examples

### Import Database
```javascript
const { db } = require('./src/db');
```

### Store Data
```javascript
await db.put('key', { data: 'value' });
```

### Get Data
```javascript
const data = await db.get('key');
```

### Delete Data
```javascript
await db.del('key');
```

### Batch Operations
```javascript
await db.batch([
  { type: 'put', key: 'key1', value: { data: 1 } },
  { type: 'put', key: 'key2', value: { data: 2 } },
  { type: 'del', key: 'key3' }
]);
```

### Prefix Query
```javascript
// Get all data for patient PAT001
const results = await db.getByPrefix('patient:PAT001:');
```

### Get All
```javascript
const all = await db.getAll(100); // limit to 100
```

### Check Exists
```javascript
const exists = await db.exists('key');
```

### Clear Database
```javascript
await db.clear(); // Use with caution!
```

## Key Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| Demographics | `patient:PAT001:demographics` | Patient demographics |
| Cancer | `patient:PAT001:cancer:CAN001` | Cancer record |
| Cancer Attrs | `patient:PAT001:cancer:CAN001:attributes` | Cancer attributes |
| Document | `patient:PAT001:document:DOC001` | Medical document |
| Concepts | `patient:PAT001:document:DOC001:concepts` | Document concepts |

## Common Queries

```javascript
// Get patient demographics
const demo = await db.get(`patient:${patientId}:demographics`);

// Get all cancers for a patient
const cancers = await db.getByPrefix(`patient:${patientId}:cancer:`);

// Get all documents
const docs = await db.getByPrefix(`patient:${patientId}:document:`);

// Get specific cancer
const cancer = await db.get(`patient:${patientId}:cancer:${cancerId}`);
```

## Configuration

The database path is configured in `src/config/database.js`:
```javascript
const DB_PATH = process.env.DB_PATH || './data/deepphe/deepphe_sqlite_compressed';
```

You can override it with an environment variable in `.env`:
```bash
PORT=3000
DB_PATH=./data/deepphe/deepphe_sqlite_compressed
```

## API Endpoints

- `GET /v1/dphe-data/patient/demographics?patientId=PAT001`
- `GET /v1/dphe-data/patient/cancers?patientId=PAT001`
- `GET /v1/dphe-data/patient/documents?patientId=PAT001`

## Test Sample Data

After running `npm run seed`:
- Patient PAT001 (John Doe)
- Patient PAT002 (Jane Smith)
- Patient PAT003 (Robert Johnson)

## File Locations

- Config: `src/config/database.js` (database path constant)
- Client: `src/db/sqlite-client.js` (SQLite implementation)
- Init: `src/db/index.js`
- Seed: `src/db/seed.js`
- Tests: `src/db/sqlite-client.test.js`
- Data: `./data/deepphe/deepphe_sqlite_compressed` (gitignored)

## Troubleshooting

**Database won't open:**
- Check `./data` directory exists
- Verify permissions

**Tests failing:**
- Run `npm install` to ensure Jest is installed
- Check `./data` directory permissions

**Can't connect:**
- Ensure server started: `npm start`
- Check port 3000 is free

## More Info

- 🧪 Testing Guide: `TEST_DOCUMENTATION.md`
- 📖 README: `README.md`

