// Generates the OpenAPI spec to a static JSON file so packaged binaries can
// serve /docs and /openapi.json without scanning route source files at runtime.
// Run from the repository root (the swagger-jsdoc `apis` glob is cwd-relative).
const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const options = require('../src/docs/swagger-options');

const spec = swaggerJSDoc(options);
const outPath = path.resolve(__dirname, '../src/docs/openapi.generated.json');
fs.writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Wrote OpenAPI spec to ${outPath}`);
