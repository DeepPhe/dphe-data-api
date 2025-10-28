const express = require("express");
const router = express.Router();
const patientCancerController = require("../controllers/patient-cancer-controller");

/**
 * @openapi
 * /v1/dphe-data/patient/cancers:
 *   get:
 *     summary: Get all cancers for a patient
 *     description: Returns list of cancer objects for a specific patient
 *     tags: [Cancer]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of cancers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cancer'
 *       400:
 *         description: Missing required parameters
 */
router.get("/cancers", patientCancerController.getCancers);

/**
 * @openapi
 * /v1/dphe-data/patient/cancer/attributes:
 *   get:
 *     summary: Get cancer attributes for a patient
 *     description: Returns list of cancer attribute objects given PATIENT_ID and CANCER_ID
 *     tags: [Cancer]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: cancerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Cancer ID
 *     responses:
 *       200:
 *         description: List of cancer attributes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NeoplasmAttribute'
 *       400:
 *         description: Missing required parameters
 */
router.get("/cancer/attributes", patientCancerController.getCancerAttributes);

/**
 * @openapi
 * /v1/dphe-data/patient/cancer/attribute/concepts:
 *   get:
 *     summary: Get cancer concepts for a patient
 *     description: Returns list of cancer concept objects given PATIENT_ID and CANCER_ID
 *     tags: [Cancer]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: cancerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Cancer ID
 *     responses:
 *       200:
 *         description: List of cancer concepts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Concept'
 *       400:
 *         description: Missing required parameters
 */
router.get("/cancer/attribute/concepts", patientCancerController.getCancerConcepts);

/**
 * @openapi
 * /v1/dphe-data/patient/cancer/attribute/mentions:
 *   get:
 *     summary: Get cancer mentions for a patient
 *     description: Returns list of cancer mention objects given PATIENT_ID and CANCER_ID
 *     tags: [Cancer]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: cancerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Cancer ID
 *     responses:
 *       200:
 *         description: List of cancer mentions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mention'
 *       400:
 *         description: Missing required parameters
 */
router.get("/cancer/attribute/mentions", patientCancerController.getCancerMentions);

module.exports = router;

