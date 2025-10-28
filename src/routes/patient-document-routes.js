const express = require("express");
const router = express.Router();
const patientDocumentController = require("../controllers/patient-document-controller");

/**
 * @openapi
 * /v1/dphe-data/patient/document/concepts:
 *   get:
 *     summary: Get concepts in a document given Patient ID and Document ID
 *     description: Returns list of concept objects extracted from a patient document
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: documentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Document ID
 *     responses:
 *       200:
 *         description: List of document concepts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Concept'
 *       400:
 *         description: Missing required parameters
 */
router.get("/document/concepts", patientDocumentController.getDocumentConcepts);

/**
 * @openapi
 * /v1/dphe-data/patient/document/mentions:
 *   get:
 *     summary: Get mentions in a document given Patient ID and Document ID
 *     description: Returns list of Mention objects
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: documentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Document ID
 *     responses:
 *       200:
 *         description: List of document mentions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mention'
 *       400:
 *         description: Missing patientId parameter
 */
router.get("/document/mentions", patientDocumentController.getDocumentMentions);

/**
 * @openapi
 * /v1/dphe-data/patient/documents/:
 *   get:
 *     summary: Get document properties for a patient
 *     description: Returns list of all documents for a specific patient
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: includeContent
 *         schema:
 *           type: boolean
 *         required: false
 *         description: 'Whether to include document content (default: false)'
 *     responses:
 *       200:
 *         description: List of DocumentXn objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DocumentXn'
 *       404:
 *         description: Patient not found
 */
router.get("/documents/", patientDocumentController.getDocuments);

module.exports = router;

