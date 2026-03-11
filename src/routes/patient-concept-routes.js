const express = require("express");
const router = express.Router();
const patientConceptController = require("../controllers/patient-concept-controller");

/*
 * @openapi
 * /v1/deepphe-api/deepphe/patient/concepts/:
 *   get:
 *     summary: Get all concepts for a patient
 *     description: Returns list of concept objects for a specific patient
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of concepts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Concept'
 *       400:
 *         description: Missing required parameters
 */
// Temporarily disabled.
// router.get("/concepts/", patientConceptController.getConcepts);

/*
 * @openapi
 * /v1/deepphe-api/deepphe/patient/conceptRelations/:
 *   get:
 *     summary: Get concept relations for a patient
 *     description: Returns list of relationships between concepts for a specific patient
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of concept relations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ConceptRelation'
 *       400:
 *         description: Missing required parameters
 */
// Temporarily disabled.
// router.get("/conceptRelations/", patientConceptController.getConceptRelations);

module.exports = router;
