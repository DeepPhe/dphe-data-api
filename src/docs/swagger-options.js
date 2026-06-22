// Shared swagger-jsdoc options, used both for live generation in development
// (src/docs/swagger.js) and for the build-time spec generated for packaged
// binaries (scripts/generate-openapi.js).
const generatedComponents = require('./generated-components');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'DeepPhe Data API', version: '1.0.0' },
    tags: [{ name: 'DeepPhe', description: 'DeepPhe endpoints' }],
    components: {
      schemas: generatedComponents.schemas || generatedComponents,
    },
  },
  apis: ['./src/routes/**/*.js'],
  failOnErrors: true,
};

module.exports = options;
