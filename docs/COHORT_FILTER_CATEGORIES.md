# Cohort Filter Categories Endpoint

## Overview

This endpoint allows you to retrieve all patients grouped by a demographic category (GENDER, RACE, or ETHNICITY).

## Endpoint

```
GET /v1/dphe-data/cohort/filter/categories/patients
```

## Query Parameters

| Parameter | Type    | Required | Description                                                                              | Valid Values                                     |
|-----------|---------|----------|------------------------------------------------------------------------------------------|--------------------------------------------------|
| category  | string  | Yes      | The demographic category to filter by                                                    | `GENDER`, `RACE`, `ETHNICITY` (case-insensitive) |
| countOnly | boolean | No       | If true, returns counts instead of patient ID arrays (more efficient for large datasets) | `true`, `false`, `1`, `0` (default: `false`)     |

## Example Requests

### Filter by Gender

```bash
curl -X GET "http://localhost:3000/v1/dphe-data/cohort/filter/categories/patients?category=GENDER"
```

### Filter by Race

```bash
curl -X GET "http://localhost:3000/v1/dphe-data/cohort/filter/categories/patients?category=RACE"
```

### Filter by Ethnicity

```bash
curl -X GET "http://localhost:3000/v1/dphe-data/cohort/filter/categories/patients?category=ETHNICITY"
```

### Get Counts Only (No Patient IDs)

```bash
# More efficient - returns only counts
curl -X GET "http://localhost:3000/v1/dphe-data/cohort/filter/categories/patients?category=GENDER&countOnly=true"

# Alternative syntax
curl -X GET "http://localhost:3000/v1/dphe-data/cohort/filter/categories/patients?category=RACE&countOnly=1"
```

## Example Response

### GENDER Response

```json
{
  "GENDER.M": ["9555534801", "9555457322", "9555457301", ...],
  "GENDER.F": ["9555555481", "9555555879", "9555555807", ...],
  "GENDER.U": ["9557213068", "9557734035", "9559452451", ...]
}
```

### RACE Response

```json
{
  "RACE.White": ["9555555879", "9555555807", ...],
  "RACE.Black": ["9555555481", "9555554044", ...],
  "RACE.Asian": ["9555524566", "9555413020", ...],
  "RACE.Unknown": ["9555549455", "9555570934", ...],
  ...
}
```

### ETHNICITY Response

```json
{
  "ETHNICITY.Not Hispanic or Latino": ["9555555481", "9555555879", ...],
  "ETHNICITY.Hispanic or Latino": ["9555599789", "9555680271", ...],
  "ETHNICITY.Unknown": ["9555551619", "9555549455", ...]
}
```

### Count Only Response (with countOnly=true)

```json
{
  "GENDER.M": 8846,
  "GENDER.F": 69538,
  "GENDER.U": 15
}
```

**Benefits of countOnly:**

- ✅ **Faster response time** - No need to retrieve and transfer all patient IDs
- ✅ **Smaller payload** - Reduces network bandwidth (typically 100-1000x smaller)
- ✅ **Lower memory usage** - Database performs aggregation efficiently
- ✅ **Perfect for dashboards** - When you only need statistics

## Response Format

The response is a JSON object where:

- **Keys**: Category values in the format `CATEGORY.VALUE` (e.g., `GENDER.M`, `RACE.White`)
- **Values**:
    - **Default mode**: Arrays of patient IDs (strings) belonging to that category value
    - **Count only mode** (`countOnly=true`): Integer count of patients in that category

## Status Codes

| Code | Description                                         |
|------|-----------------------------------------------------|
| 200  | Success - returns patient groups                    |
| 400  | Bad Request - missing or invalid category parameter |
| 500  | Internal Server Error                               |

## Error Responses

### Missing Category Parameter

```json
{
  "error": "Missing required query parameter: category"
}
```

### Invalid Category Type

```json
{
  "error": "Invalid category: INVALID. Must be one of: GENDER, RACE, ETHNICITY"
}
```

## Implementation Details

This endpoint:

1. Accepts a category type as a query parameter (GENDER, RACE, or ETHNICITY)
2. Optionally accepts `countOnly` parameter for efficient count-only queries
3. Connects to the MySQL database using the `MySQLClient`
4. Queries the `CALCULATED_PATIENT_DATA` table
    - **Default mode**: Fetches all patient IDs and groups them in-memory
    - **Count only mode**: Uses SQL `GROUP BY` and `COUNT(*)` for efficient aggregation
5. Returns all groups for that category

**Performance Notes:**

- Category parameter is case-insensitive (e.g., `gender`, `Gender`, `GENDER` all work)
- `countOnly=true` uses database-level aggregation for optimal performance
- Count-only queries are typically 10-100x faster and use 100-1000x less bandwidth

## Use Cases

### Getting All Male Patients

```javascript
const response = await axios.get('/v1/dphe-data/cohort/filter/categories/patients', {
  params: { category: 'GENDER' }
});

const malePatients = response.data['GENDER.M'] || [];
console.log(`Found ${malePatients.length} male patients`);
```

### Getting Patients by Race

```javascript
const response = await axios.get('/v1/dphe-data/cohort/filter/categories/patients', {
  params: { category: 'RACE' }
});

const whitePatients = response.data['RACE.White'] || [];
const blackPatients = response.data['RACE.Black'] || [];
console.log(`White: ${whitePatients.length}, Black: ${blackPatients.length}`);
```

### Building Cohorts

```javascript
const response = await axios.get('/v1/dphe-data/cohort/filter/categories/patients', {
  params: { category: 'ETHNICITY' }
});

// Get Hispanic patients
const hispanicPatients = response.data['ETHNICITY.Hispanic or Latino'] || [];

// Use these patient IDs for further queries
for (const patientId of hispanicPatients) {
  // Fetch patient documents, cancers, etc.
}
```

### Dashboard Statistics (Count Only)

```javascript
// Much faster for displaying statistics
const response = await axios.get('/v1/dphe-data/cohort/filter/categories/patients', {
  params: { 
    category: 'GENDER',
    countOnly: 'true'
  }
});

// Display counts in dashboard
console.log(`Male: ${response.data['GENDER.M']}`);
console.log(`Female: ${response.data['GENDER.F']}`);
console.log(`Unknown: ${response.data['GENDER.U']}`);

// Calculate percentages
const total = Object.values(response.data).reduce((sum, count) => sum + count, 0);
const femalePercent = ((response.data['GENDER.F'] / total) * 100).toFixed(1);
console.log(`Female percentage: ${femalePercent}%`);
```

### Choosing Between Modes

```javascript
// Use countOnly=true when:
// ✅ You only need statistics/counts
// ✅ Building dashboard visualizations
// ✅ Checking category distributions
// ✅ Large datasets (>10K patients)

// Use default mode (with patient IDs) when:
// ✅ You need to process individual patients
// ✅ Building cohorts for further analysis
// ✅ Exporting patient lists
// ✅ Small datasets (<1K patients)
```

## Testing

Run the test script to verify the endpoint:

```bash
node test-category-filter.js
```

This will test:

- ✅ Filtering by GENDER
- ✅ Filtering by RACE
- ✅ Filtering by ETHNICITY
- ✅ Case insensitivity
- ✅ Invalid category handling
- ✅ Missing parameter handling

## Performance Considerations

- The endpoint queries the MySQL database each time it's called
- Results are not cached
- For frequently accessed categories, consider implementing caching
- The MySQL connection is opened and closed for each request

## Related Endpoints

- `GET /v1/dphe-data/patient/:patientId/documents` - Get documents for a specific patient
- `GET /v1/dphe-data/patient/:patientId/concepts` - Get concepts for a specific patient
- `GET /v1/dphe-data/patient/:patientId/cancers` - Get cancers for a specific patient

