const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const dpheRoutes = require('./routes/dphe-data-routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Swagger docs - auto-generated from JSDoc comments
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      docExpansion: 'none',
    },
  }),
);

// Serve raw OpenAPI JSON spec
app.get('/openapi.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(swaggerSpec);
});

// Routes
app.use('/v1/deepphe-api/', dpheRoutes);

module.exports = app;
