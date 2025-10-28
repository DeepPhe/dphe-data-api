const express = require("express");
const router = express.Router();
const patientDemographicsController = require("../controllers/patient-demographics-controller");

/**
 * @openapi
 * /v1/dphe-data/patient/demographics:
 *   get:
 *     summary: Get demographics for a patient
 *     description: Returns list of demographic key-value pairs for a specific patient
 *     tags: [Demographics]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of demographic key-value pairs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   key:
 *                     type: string
 *                   value:
 *                     type: string
 *       400:
 *         description: Missing required parameters
 */
router.get("/demographics", patientDemographicsController.getDemographics);

module.exports = router;

