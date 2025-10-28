// src/docs/components.js
const generatedComponents = require('./generated-components');

/**
 * @openapi
 * components:
 *   schemas:
 *     Todo:
 *       type: object
 *       required: [id, title, done]
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "learn swagger"
 *         done:
 *           type: boolean
 *           example: false
 *     # Additional manual schemas can be defined here
 */

module.exports = {
  schemas: {
    ...generatedComponents.schemas,
    Todo: {
      type: 'object',
      required: ['id', 'title', 'done'],
      properties: {
        id: { type: 'integer', example: 1 },
        title: { type: 'string', example: 'learn swagger' },
        done: { type: 'boolean', example: false }
      }
    }
  }
};