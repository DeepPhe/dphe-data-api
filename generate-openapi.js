const swaggerSpec = require('./src/docs/swagger');
const fs = require('fs');

// Generate the OpenAPI JSON
const openApiJson = JSON.stringify(swaggerSpec, null, 2);

// Write it to a file
fs.writeFileSync('openapi.json', openApiJson);

console.log('OpenAPI JSON generated successfully!');

// Check if includePatientIds parameter exists in the specified endpoints
const paths = swaggerSpec.paths;
const cancersInstancesPath = paths['/v1/dphe-data/cancers/instances'];
const conceptsInstancesPath = paths['/v1/dphe-data/concepts/instances'];

if (cancersInstancesPath && cancersInstancesPath.get) {
  const cancersParams = cancersInstancesPath.get.parameters || [];
  const hasIncludePatientIds = cancersParams.some(param => param.name === 'includePatientIds');
  console.log('cancers/instances has includePatientIds parameter:', hasIncludePatientIds);
} else {
  console.log('cancers/instances endpoint not found in OpenAPI spec');
}

if (conceptsInstancesPath && conceptsInstancesPath.get) {
  const conceptsParams = conceptsInstancesPath.get.parameters || [];
  const hasIncludePatientIds = conceptsParams.some(param => param.name === 'includePatientIds');
  console.log('concepts/instances has includePatientIds parameter:', hasIncludePatientIds);
} else {
  console.log('concepts/instances endpoint not found in OpenAPI spec');
}
