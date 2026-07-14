#!/usr/bin/env node

import childProcess from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPENAPI_SOURCE_PATH = path.join(ROOT_DIR, 'src', 'docs', 'openapi.generated.json');
const STATIC_OPENAPI_PATH = path.join(ROOT_DIR, 'docs-site', 'static', 'openapi.json');
const GENERATED_REFERENCE_PATH = path.join(ROOT_DIR, 'docs', 'reference', 'openapi.md');
const DOCS_SITE_URL = 'https://deepphe.github.io/dphe-data-api/openapi.json';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

function runOpenApiBuild() {
  childProcess.execFileSync(process.execPath, [path.join(ROOT_DIR, 'scripts', 'generate-openapi.js')], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
}

function readOpenApiSpec() {
  return JSON.parse(fs.readFileSync(OPENAPI_SOURCE_PATH, 'utf8'));
}

function escapeMarkdown(value) {
  return String(value ?? '')
    .replace(/\r?\n+/g, '<br />')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .trim();
}

function code(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``;
}

function schemaType(schema) {
  if (!schema) {
    return '';
  }

  if (schema.$ref) {
    return schema.$ref.split('/').pop();
  }

  if (schema.oneOf) {
    return schema.oneOf.map(schemaType).filter(Boolean).join(' | ');
  }

  if (schema.anyOf) {
    return schema.anyOf.map(schemaType).filter(Boolean).join(' | ');
  }

  if (schema.enum) {
    return schema.enum.map((value) => String(value)).join(' | ');
  }

  if (schema.type === 'array') {
    return `${schemaType(schema.items) || 'unknown'}[]`;
  }

  return schema.type || '';
}

function formatParameterTable(parameters = []) {
  if (parameters.length === 0) {
    return '';
  }

  const rows = parameters.map((parameter) => {
    const type = schemaType(parameter.schema) || 'value';
    return [
      code(parameter.name),
      parameter.in,
      parameter.required ? 'yes' : 'no',
      code(type),
      escapeMarkdown(parameter.description || ''),
    ];
  });

  return [
    '| Name | In | Required | Type | Description |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n');
}

function formatRequestBody(requestBody) {
  if (!requestBody) {
    return '';
  }

  const contentTypes = Object.keys(requestBody.content || {});
  if (contentTypes.length === 0) {
    return requestBody.required ? '**Request body:** required\n' : '**Request body:** optional\n';
  }

  const content = contentTypes.map(code).join(', ');
  return `**Request body:** ${requestBody.required ? 'required' : 'optional'} (${content})\n`;
}

function formatResponses(responses = {}) {
  const statuses = Object.entries(responses);
  if (statuses.length === 0) {
    return '';
  }

  return [
    '| Status | Description |',
    '| --- | --- |',
    ...statuses.map(([status, response]) => {
      return `| ${code(status)} | ${escapeMarkdown(response.description || '')} |`;
    }),
    '',
  ].join('\n');
}

function collectOperations(spec) {
  const operations = [];

  for (const [routePath, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      operations.push({
        method: method.toUpperCase(),
        routePath,
        tag: operation.tags?.[0] || 'API',
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [...(pathItem.parameters || []), ...(operation.parameters || [])],
        requestBody: operation.requestBody,
        responses: operation.responses || {},
      });
    }
  }

  return operations.sort((a, b) => {
    return a.tag.localeCompare(b.tag) || a.routePath.localeCompare(b.routePath) || a.method.localeCompare(b.method);
  });
}

function renderOperation(operation) {
  const methodClass = operation.method.toLowerCase();
  const parts = [
    `### <span className="api-method api-method-${methodClass}">${operation.method}</span> ${code(operation.routePath)}`,
    '',
  ];

  if (operation.summary) {
    parts.push(escapeMarkdown(operation.summary), '');
  }

  if (operation.description && operation.description !== operation.summary) {
    parts.push(escapeMarkdown(operation.description), '');
  }

  const parameterTable = formatParameterTable(operation.parameters);
  if (parameterTable) {
    parts.push('**Parameters**', '', parameterTable);
  }

  const requestBody = formatRequestBody(operation.requestBody);
  if (requestBody) {
    parts.push(requestBody);
  }

  const responses = formatResponses(operation.responses);
  if (responses) {
    parts.push('**Responses**', '', responses);
  }

  return parts.join('\n');
}

function renderReferencePage(spec) {
  const operations = collectOperations(spec);
  const tags = new Map();

  for (const operation of operations) {
    const list = tags.get(operation.tag) || [];
    list.push(operation);
    tags.set(operation.tag, list);
  }

  const lines = [
    '---',
    'title: OpenAPI Reference',
    'description: Generated endpoint reference for the DeepPhe Data API.',
    'custom_edit_url: null',
    '---',
    '',
    '# OpenAPI reference',
    '',
    'This page is generated by `npm run docs:prepare` from route-level OpenAPI comments.',
    '',
    `Download the published OpenAPI JSON from [${DOCS_SITE_URL}](${DOCS_SITE_URL}), or run the API and open \`http://localhost:3333/docs\`.`,
    '',
    ':::info Generated content',
    '',
    'Do not edit this page directly. Update the OpenAPI comments in `src/routes/` and rerun `npm run docs:prepare`.',
    '',
    ':::',
    '',
  ];

  for (const [tag, taggedOperations] of tags) {
    lines.push(`## ${tag}`, '');
    for (const operation of taggedOperations) {
      lines.push(renderOperation(operation), '');
    }
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

async function prepareDocs() {
  runOpenApiBuild();

  const spec = readOpenApiSpec();
  await fsp.mkdir(path.dirname(STATIC_OPENAPI_PATH), {recursive: true});
  await fsp.mkdir(path.dirname(GENERATED_REFERENCE_PATH), {recursive: true});
  await fsp.copyFile(OPENAPI_SOURCE_PATH, STATIC_OPENAPI_PATH);
  await fsp.writeFile(GENERATED_REFERENCE_PATH, renderReferencePage(spec));

  console.log(`Documentation OpenAPI JSON ready: ${STATIC_OPENAPI_PATH}`);
  console.log(`Generated endpoint reference ready: ${GENERATED_REFERENCE_PATH}`);
}

prepareDocs().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
