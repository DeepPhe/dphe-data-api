const app = require('./src/app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`dphe-data-api listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/openapi.json`);
});

