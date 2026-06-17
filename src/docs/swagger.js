// src/docs/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const generatedComponents = require('./generated-components');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'DeepPhe Data API', version: '1.0.0' },
    tags: [
      { name: 'DeepPhe', description: 'DeepPhe endpoints' }
    ],
    components: {
      schemas: generatedComponents.schemas || generatedComponents,
    },
  },
  apis: ['./src/routes/**/*.js'],
  failOnErrors: true
};

const spec = swaggerJSDoc(options);

module.exports = spec;
