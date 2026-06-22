// src/docs/swagger.js
let spec;

if (process.pkg) {
  // In a packaged binary the route source files are not present on disk for
  // swagger-jsdoc to scan, so use the spec generated at build time
  // (scripts/generate-openapi.js).
  spec = require('./openapi.generated.json');
} else {
  const swaggerJSDoc = require('swagger-jsdoc');
  const options = require('./swagger-options');
  spec = swaggerJSDoc(options);
}

module.exports = spec;
