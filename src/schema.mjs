import generateSchema from 'json-schema-generator';
import patientData from '../patient.json' with { type: 'json' };

// Generate the schema
const schema = generateSchema(patientData);

// Output the schema
console.log(JSON.stringify(schema, null, 2));;