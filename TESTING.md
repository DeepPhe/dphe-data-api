# Testing Guide

Comprehensive guide for testing the DPHE Data API.

## 📋 Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Troubleshooting](#troubleshooting)

## Setup

### Prerequisites

Before running tests, ensure you have:

1. **Node.js installed** (v14 or higher)
2. **Dependencies installed**:
   ```bash
   npm install
   ```
3. **Environment configured** - See [Environment Setup](#environment-setup)

### Environment Setup

Tests require configuration through environment variables.

#### 1. Create `.env` file

Copy the example environment file:

```bash
cp .env.example .env
```

#### 2. Configure Test Variables

Edit the `.env` file and set the required variables:

```bash
# Server Configuration
PORT=3000

# Database Configuration
DB_PATH=./data/deepphe/deepphe_sqlite_compressed

# Test Configuration
TEST_PATIENT_ID=1234  # Replace with your test patient ID
```

**Important:** Replace `TEST_PATIENT_ID` with an actual patient ID from your database.

#### 3. Verify Database Exists

Ensure the database file exists at the path specified in `DB_PATH`:

```bash
ls -lh ./data/deepphe/deepphe_sqlite_compressed
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

Run only the SQLite client tests:

```bash
npm test -- src/db/sqlite-client.test.js
```

Or using a pattern:

```bash
npm test -- sqlite-client
```

### Watch Mode

Run tests in watch mode (re-runs tests on file changes):

```bash
npm run test:watch
```

### With Coverage

Generate test coverage report:

```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Test Structure

### SQLite Client Test Suite

The main test suite (`src/db/sqlite-client.test.js`) validates the complete workflow from HTTP controller to database.

#### Test Organization

```javascript
describe('SQLiteClient - Real Database Tests', () => {
  
  beforeAll()  // Opens database connection
  afterAll()   // Closes database connection
  
  describe('getDocuments', () => {
    // Document retrieval tests
  });
  
  describe('Database connection', () => {
    // Connection tests
  });
});
```

### Test Cases

#### 1. Document Retrieval via Controller
- Calls `getDocuments()` controller function with mocked request/response
- Retrieves all documents for the configured test patient
- Validates document structure and response format
- Logs sample documents for verification

#### 2. Text Exclusion
- Tests `excludeProperties=text` to verify text content is excluded
- Validates the controller's property filtering logic

#### 3. Error Handling
- Tests missing patientId parameter
- Verifies proper 400 status code and error messages
- Ensures controller validation works correctly

#### 4. Decompression via Controller
- Verifies zstd decompression works correctly through the full stack
- Ensures all compressed content is properly decoded
- Validates JSON parsing through the controller

#### 5. Property Exclusion
- Tests `excludeProperties` parameter with multiple properties
- Verifies excluded properties are not present in response
- Validates other properties remain intact

#### 6. Invalid Property Exclusion
- Tests invalid property names in `excludeProperties`
- Verifies proper 400 error response

#### 7. Document ID Filtering
- Tests `documentIds` parameter to filter specific documents
- Verifies exact document count matches filter
- Validates correct documents are returned

#### 8. Empty Filter Results
- Tests non-matching `documentIds`
- Verifies empty array is returned (not 404)

#### 9. Database Connection Tests
- Verifies database opens successfully
- Validates database path configuration

## Expected Test Output

When tests run successfully, you should see:

```
 PASS  src/db/sqlite-client.test.js
  SQLiteClient - Real Database Tests
    getDocuments
      ✓ should retrieve documents for patient via controller (29 ms)
      ✓ should exclude text when excludeProperties includes text (14 ms)
      ✓ should handle missing patientId parameter (1 ms)
      ✓ should handle decompression correctly via controller (60 ms)
      ✓ should exclude properties when excludeProperties is specified (89 ms)
      ✓ should return 400 for invalid excludeProperties (1 ms)
      ✓ should filter documents by documentIds when specified (10 ms)
      ✓ should return empty array when documentIds do not match any documents (11 ms)
    Database connection
      ✓ should be open
      ✓ should have valid database path (1 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        0.5-1 s
```

### Console Output

The tests also log useful information:

```
Database opened successfully
Found 499 documents for patient 1234
Sample documents:
  - {"id":"1234","name":"1234","mentions":[]...
  - {"id":"1234_456_D_100","name":"8873141988"...
First document keys: [ 'id', 'name', 'mentions', 'mentionRelations' ]
✓ Text property successfully excluded
✓ Correctly handles missing patientId
✓ Properties successfully excluded via excludeProperties parameter
✓ Successfully filtered to 2 documents by documentIds
Database path: /path/to/database
Database closed successfully
```

## Writing Tests

### Test Template

To add new tests, follow this pattern:

```javascript
describe('My Test Suite', () => {
  beforeAll(async () => {
    // Setup before all tests
    await db.open();
  });

  afterAll(async () => {
    // Cleanup after all tests
    await db.close();
  });

  test('should do something', async () => {
    // Mock Express request
    const req = {
      params: { patientId: TEST_PATIENT_ID },
      query: {}
    };

    // Mock Express response
    let responseData;
    let statusCode = 200;
    
    const res = {
      json: (data) => { responseData = data; },
      status: (code) => {
        statusCode = code;
        return res;
      }
    };

    // Call controller
    await controllerFunction(req, res);

    // Assertions
    expect(statusCode).toBe(200);
    expect(responseData).toBeDefined();
    expect(Array.isArray(responseData)).toBe(true);
  });
});
```

### Testing Controllers

Controllers expect Express `req` and `res` objects. Mock them like this:

```javascript
const req = {
  params: { patientId: '123456789' },  // URL parameters
  query: { documentIds: 'doc1,doc2' }  // Query parameters
};

let responseData;
let statusCode = 200;

const res = {
  json: (data) => { responseData = data; },
  status: (code) => {
    statusCode = code;
    return res;  // Return res for chaining
  }
};
```

### Testing Database Operations

```javascript
test('should store and retrieve data', async () => {
  const key = 'test-key';
  const value = { name: 'Test', data: [1, 2, 3] };

  await db.put(key, value);
  const result = await db.get(key);

  expect(result).toEqual(value);
});
```

## Test Configuration

### Jest Configuration

The project uses Jest for testing. Configuration is in `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
};
```

### Test File Location

Test files are located alongside their source files:
- `src/db/sqlite-client.test.js` - SQLite client tests
- More test files can be added following the `*.test.js` naming convention

## Test Coverage

### Viewing Coverage

Generate and view coverage report:

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory. Open `coverage/index.html` in a browser to view detailed coverage.

### Coverage Metrics

The test suite aims for:
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

### Current Coverage

The SQLite client tests cover:
- ✅ Document retrieval
- ✅ Property exclusion
- ✅ Document filtering by ID
- ✅ Error handling
- ✅ zstd decompression
- ✅ Database operations (CRUD)

## Troubleshooting

### Error: TEST_PATIENT_ID must be set in .env file

**Solution:** Add `TEST_PATIENT_ID` to your `.env` file with a valid patient ID.

```bash
TEST_PATIENT_ID=1234
```

### Error: SQLITE_ERROR: no such table: files

**Solution:** Verify the database path in `.env` is correct and points to the actual database file with the proper schema.

### Error: Database is not open

**Solution:** The database file may not exist or may be corrupted. Check:
- Database file exists at the specified path
- File has read permissions
- Database file is not corrupted

### Decompression Errors

**Solution:** Ensure the `@mongodb-js/zstd` package is installed:

```bash
npm install @mongodb-js/zstd
```

### Port Already in Use

If tests hang or fail to connect:

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill
```

### Tests Timeout

If tests timeout, increase Jest timeout in the test file:

```javascript
jest.setTimeout(10000); // 10 seconds
```

Or per test:

```javascript
test('long running test', async () => {
  // Test code
}, 10000); // 10 second timeout
```

## Security Notes

⚠️ **Important:** Never commit the `.env` file to version control. It contains sensitive information like patient IDs.

The `.gitignore` file is configured to exclude:
- `.env`
- `.env.local`
- `.env.*.local`

Only `.env.example` should be committed as a template.

## Continuous Integration

To run tests in CI/CD pipelines:

1. Set environment variables in your CI configuration
2. Install dependencies: `npm install`
3. Run tests: `npm test`

### Example for GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run Tests
      env:
        TEST_PATIENT_ID: ${{ secrets.TEST_PATIENT_ID }}
        DB_PATH: ./data/test-database.db
      run: npm test
```

## Best Practices

### 1. Use Real Data When Possible
- Tests use actual database to ensure realistic scenarios
- Test with representative patient data

### 2. Clean Up After Tests
- Use `afterAll()` to close connections
- Don't leave test data in database

### 3. Test Error Cases
- Test missing parameters
- Test invalid input
- Test edge cases

### 4. Use Descriptive Test Names
```javascript
// Good
test('should return 400 when patientId is missing', ...)

// Bad
test('test1', ...)
```

### 5. Keep Tests Independent
- Each test should work in isolation
- Don't depend on test execution order

### 6. Mock External Dependencies
- Mock HTTP requests
- Mock file system operations
- Use real database only for integration tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [SQLite3 Documentation](https://www.sqlite.org/docs.html)
- [Project README](./README.md)
- [Quick Reference](./QUICK_REFERENCE.md)

## Test Metrics

Current test suite metrics:

- **Total Tests:** 10
- **Test Suites:** 1
- **Coverage:** Database client operations, document retrieval, filtering
- **Average Run Time:** <1 second
- **Success Rate:** 100% (when properly configured)

## Future Test Coverage

Areas for additional testing:

- [ ] Patient cancer data endpoints
- [ ] Patient concept endpoints
- [ ] Demographics endpoints
- [ ] Cohort filtering endpoints
- [ ] Performance/load testing
- [ ] Error recovery scenarios
- [ ] Database migration scenarios

