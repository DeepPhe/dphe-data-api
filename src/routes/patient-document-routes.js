const express = require("express");
const router = express.Router();
const patientDocumentController = require("../controllers/patient-document-controller");

/**
 * @openapi
 * /v1/dphe-data/patient/{patientId}/documents:
 *   get:
 *     summary: Get all documents for a patient
 *     description: Returns list of all DocumentXn objects for a specific patient. Each document includes mentions, mentionRelations, sections, and other properties.
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: documentIds
 *         schema:
 *           type: string
 *         required: false
 *         description: 'Comma-separated list of document IDs to filter by. Only documents matching these IDs will be returned.'
 *         example: 'DOC123,DOC456,DOC789'
 *       - in: query
 *         name: excludeProperties
 *         schema:
 *           type: string
 *         required: false
 *         description: 'Comma-separated list of DocumentXn properties to exclude from results (e.g., "mentions,mentionRelations,sections"). Valid properties: id, name, type, date, episode, text, mentions, mentionRelations, sections'
 *         example: 'text,mentionRelations'
 *     responses:
 *       200:
 *         description: List of DocumentXn objects with all properties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DocumentXn'
 *       400:
 *         description: Missing or invalid patientId
 *       404:
 *         description: Patient not found
 */
router.get("/:patientId/documents", patientDocumentController.getDocuments);

module.exports = router;

