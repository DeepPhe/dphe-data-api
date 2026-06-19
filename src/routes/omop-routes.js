const express = require('express');
const router = express.Router();
const omopController = require('../controllers/omop-controller');
const summaryController = require('../controllers/summary-controller');

/**
 * @openapi
 * /v1/deepphe-api/omop/classes:
 *   get:
 *     summary: Get all supported OMOP classes
 *     description: Returns list of OMOP class names available for OMOP instances queries
 *     tags: [OMOP]
 *     responses:
 *       200:
 *         description: List of OMOP class names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error
 */
router.get('/classes', omopController.getOmopClasses);

// Alias route kept for compatibility; intentionally hidden from Swagger docs.
router.get('/classes/patients', omopController.getOmopClasses);

/**
 * @openapi
 * /v1/deepphe-api/omop/summary:
 *   get:
 *     summary: Get all OMOP classes and instances in one response
 *     description: Returns OMOP classes with instances grouped by class, with optional patient identifier data
 *     tags: [OMOP]
 *     parameters:
 *       - in: query
 *         name: includePatientIds
 *         schema:
 *           type: boolean
 *           default: true
 *         required: false
 *         description: When false, omit patient identifier arrays from instance rows
 *     responses:
 *       200:
 *         description: OMOP summary payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 classes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 instancesByClass:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                 timing:
 *                   type: object
 *                   properties:
 *                     totalMs:
 *                       type: number
 *       500:
 *         description: Internal server error
 */
router.get('/summary', summaryController.getOmopSummary);

/**
 * @openapi
 * /v1/deepphe-api/omop/instances:
 *   get:
 *     summary: Get all OMOP instances for a specific class
 *     description: Returns OMOP rows from one of the OMOP tables by class (without patient identifier arrays)
 *     tags: [OMOP]
 *     parameters:
 *       - in: query
 *         name: attribute
 *         schema:
 *           type: string
 *           enum: [AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER]
 *         required: true
 *         description: OMOP class to retrieve
 *     responses:
 *       200:
 *         description: OMOP class rows
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing or invalid required parameters
 *       404:
 *         description: No OMOP rows found for this class
 *       500:
 *         description: Internal server error
 */
router.get('/instances', omopController.getOmopInstances);

/**
 * @openapi
 * /v1/deepphe-api/omop/instances/patients:
 *   get:
 *     summary: Get all OMOP instances for a specific class including patient identifiers
 *     description: Returns OMOP rows from one of the OMOP tables by class with patient identifier arrays
 *     tags: [OMOP]
 *     parameters:
 *       - in: query
 *         name: attribute
 *         schema:
 *           type: string
 *           enum: [AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER]
 *         required: true
 *         description: OMOP class to retrieve
 *     responses:
 *       200:
 *         description: OMOP class rows with patient identifier arrays
 *       400:
 *         description: Missing or invalid required parameters
 *       404:
 *         description: No OMOP rows found for this class
 *       500:
 *         description: Internal server error
 */
router.get('/instances/patients', omopController.getOmopInstances);

/**
 * @openapi
 * /v1/deepphe-api/omop/instances/patient/{patientId}:
 *   get:
 *     summary: Get OMOP instances for a specific class and patient
 *     description: Returns OMOP rows where the specified patient appears
 *     tags: [OMOP]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: attribute
 *         schema:
 *           type: string
 *           enum: [AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER]
 *         required: true
 *         description: OMOP class to retrieve
 *     responses:
 *       200:
 *         description: Matching OMOP class rows for the patient
 *       400:
 *         description: Missing or invalid required parameters
 *       404:
 *         description: No OMOP rows found for this class and patient
 *       500:
 *         description: Internal server error
 */
router.get('/instances/patient/:patientId', omopController.getOmopInstancesForPatient);
router.get('/instances/patient/:patientId/patients', omopController.getOmopInstancesForPatient);

module.exports = router;
