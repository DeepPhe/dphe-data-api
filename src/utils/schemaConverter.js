const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { compile } = require('json-schema-to-typescript');

async function fetchSchema(url) {
  const response = await axios.get(url);
  return response.data;
}

async function fetchSchemaListFromIndexPage() {
  // Implementation to fetch schema list
  // This should return array of schema paths like ['schemas/v0.7.0/Section.schema.json']
}

async function convertSchemaToOpenAPI(schema, typeName) {
  // Create OpenAPI component from schema
  return {
    schemas: {
      [typeName]: {
        ...schema,
        title: typeName,
      },
    },
  };
}

// Convert schema URL to proper type name
function getTypeNameFromUrl(url) {
  // Extract base filename
  const filename = url.split('/').pop();
  // Remove schema extensions
  const baseName = filename.replace(/\.schema\.json$/, '');
  // Convert to PascalCase
  return baseName.charAt(0).toUpperCase() + baseName.slice(1);
}

// Fix schema references to use proper type names
function fixSchemaReferences(schema, urlToNameMap) {
  if (!schema || typeof schema !== 'object') return;

  // Process each property
  Object.keys(schema).forEach((key) => {
    const value = schema[key];

    // Handle $ref specially
    if (key === '$ref' && typeof value === 'string') {
      // Check if this is a URL reference we need to remap
      for (const [url, name] of Object.entries(urlToNameMap)) {
        if (value === url) {
          // Replace with clean reference
          schema.$ref = `#/definitions/${name}`;
          return;
        }
      }
    }
    // Recursively process nested objects and arrays
    else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item) => fixSchemaReferences(item, urlToNameMap));
      } else {
        fixSchemaReferences(value, urlToNameMap);
      }
    }
  });
}

async function generateModelsFromRepo() {
  const baseUrl = 'https://deepphe.github.io/dphe-json-schemas/';
  const schemaUrls = await fetchSchemaListFromIndexPage();

  const components = { schemas: {} };
  const typesDir = path.join(__dirname, '..', 'types');
  const docsDir = path.join(__dirname, '..', 'docs');

  // Create directories if they don't exist
  fs.mkdirSync(typesDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  // Build mapping from URLs to clean type names
  const urlToNameMap = {};
  for (const schemaPath of schemaUrls) {
    const fullUrl = `${baseUrl}${schemaPath}`;
    urlToNameMap[fullUrl] = getTypeNameFromUrl(fullUrl);
  }

  // Process each schema
  for (const schemaPath of schemaUrls) {
    try {
      const fullUrl = `${baseUrl}${schemaPath}`;
      console.log(`Processing ${fullUrl}`);

      const schema = await fetchSchema(fullUrl);
      const typeName = urlToNameMap[fullUrl];

      // Add title to schema for proper type naming
      const schemaWithTitle = {
        ...schema,
        title: typeName,
      };

      // Fix any references to other schemas
      fixSchemaReferences(schemaWithTitle, urlToNameMap);

      // Add to OpenAPI components
      const result = await convertSchemaToOpenAPI(schemaWithTitle, typeName);
      Object.assign(components.schemas, result.schemas);

      // Generate TypeScript definition
      const tsCode = await compile(schemaWithTitle, typeName, {
        bannerComment: '',
        style: { singleQuote: true },
        unreachableDefinitions: false,
        declareExternallyReferenced: false,
      });

      fs.writeFileSync(path.join(typesDir, `${typeName}.d.ts`), tsCode);
      console.log(`Generated model for ${typeName}`);
    } catch (error) {
      console.error(`Error processing ${schemaPath}:`, error);
    }
  }

  // Write OpenAPI components to file
  const fileContent = `module.exports = ${JSON.stringify({ schemas: components.schemas }, null, 2)};\n`;
  fs.writeFileSync(path.join(docsDir, 'generated-components.js'), fileContent);
  console.log('Schema generation complete!');
}

module.exports = {
  generateModelsFromRepo,
};
