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

module.exports = router;

