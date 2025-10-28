// src/docs/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const generatedComponents = require('./generated-components');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'DeepPhe Data API', version: '1.0.0' },
    components: {
      schemas: generatedComponents.schemas || generatedComponents,
    },
  },
  apis: ['./src/routes/**/*.js'],
  failOnErrors: true
};

// Generate spec once
const spec = swaggerJSDoc(options);

// Debug: log what's actually in the spec
console.log('Generated spec has schemas:', Object.keys(spec.components?.schemas || {}).slice(0, 5));
console.log('Mention exists:', !!spec.components?.schemas?.Mention);

module.exports = spec;