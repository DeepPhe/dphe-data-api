const express = require('express');
const router = express.Router();
const patientDocumentController = require('../controllers/patient-document-controller');
const cancersController = require('../controllers/cancers-controller');
const conceptsController = require('../controllers/concepts-controller');

/**
 * @openapi
 * /v1/deepphe-api/deepphe/patient/{patientId}:
 *   get:
 *     summary: Get patient documents with text excluded by default
 *     description: Returns list of DocumentXn objects for a specific patient, with the text field excluded.
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of DocumentXn objects without text
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
router.get('/:patientId', patientDocumentController.getPatient);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/patient/{patientId}/documents:
 *   get:
 *     summary: Get all documents for a patient
 *     description: Returns list of all DocumentXn objects for a specific patient with optional property exclusions.
 *     tags: [DeepPhe]
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
router.get('/:patientId/documents', patientDocumentController.getDocuments);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/patient/{patientId}/documents/episodes:
 *   get:
 *     summary: Get episode counts for patient documents
 *     description: Returns an object keyed by normalized episode type with counts for the patient's documents.
 *     tags: [DeepPhe]
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
 *         description: 'Optional comma-separated list of document IDs to include in the count.'
 *         example: 'DOC123,DOC456'
 *     responses:
 *       200:
 *         description: Episode counts keyed by episode type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: integer
 *             example:
 *               unknown: 12
 *               treatment: 6
 *       400:
 *         description: Missing or invalid patientId
 *       500:
 *         description: Internal server error
 */
router.get('/:patientId/documents/episodes', patientDocumentController.getDocumentEpisodeCounts);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/patient/{patientId}/cancers:
 *   get:
 *     summary: Get the cancers file for a patient
 *     description: Returns the raw parsed JSON from the {patientId}_Cancers.json key-value entry in the database.
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Cancers data for the patient
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing patientId
 *       404:
 *         description: Cancers file not found for this patient
 *       500:
 *         description: Internal server error
 */
router.get('/:patientId/cancers', cancersController.getPatientCancersFile);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/patient/{patientId}/concepts:
 *   get:
 *     summary: Get the concepts file for a patient
 *     description: Returns the raw parsed JSON from the {patientId}_Concepts.json key-value entry in the database.
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Concepts data for the patient
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing patientId
 *       404:
 *         description: Concepts file not found for this patient
 *       500:
 *         description: Internal server error
 */
router.get('/:patientId/concepts', conceptsController.getPatientConceptsFile);

module.exports = router;
