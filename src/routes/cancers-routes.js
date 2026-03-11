const express = require("express");
const router = express.Router();
const cancersController = require("../controllers/cancers-controller");

/**
 * @openapi
 * /v1/deepphe-api/deepphe/cancers/classes:
 *   get:
 *     summary: Get all unique cancer classes
 *     description: Returns list of unique cancer class classUri values
 *     tags: [DeepPhe]
 *     responses:
 *       200:
 *         description: List of cancer class classUri values
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error
 */
router.get("/classes", cancersController.getCancersClasses);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/cancers/instances:
 *   get:
 *     summary: Get all cancer instances for a specific class
 *     description: Returns list of cancer objects for a specific class (without patientIds)
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: query
 *         name: classUri
 *         schema:
 *           type: string
 *         required: true
 *         description: Class URI
 *     responses:
 *       200:
 *         description: List of cancers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique identifier for the cancer
 *                   classUri:
 *                     type: string
 *                     description: URI of the cancer class
 *                   value:
 *                     type: string
 *                     description: Value of the cancer
 *                   negated:
 *                     type: integer
 *                     description: Flag indicating if the cancer is negated (0 or 1)
 *                   uncertain:
 *                     type: integer
 *                     description: Flag indicating if the cancer is uncertain (0 or 1)
 *                   historic:
 *                     type: integer
 *                     description: Flag indicating if the cancer is historic (0 or 1)
 *                   num_patients:
 *                     type: integer
 *                     description: Number of patients with this cancer
 *               example:
 *                 - id: 123
 *                   classUri: "Breast_Cancer"
 *                   value: "Breast Cancer"
 *                   negated: 0
 *                   uncertain: 0
 *                   historic: 0
 *                   num_patients: 5
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No cancers found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances", cancersController.getCancersInstances);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/cancers/instances/patients:
 *   get:
 *     summary: Get all cancer instances for a specific class including patientIds
 *     description: Returns list of cancer objects for a specific class with patientIds
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: query
 *         name: classUri
 *         schema:
 *           type: string
 *         required: true
 *         description: Class URI
 *     responses:
 *       200:
 *         description: List of cancers with patientIds
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No cancers found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patients", cancersController.getCancersInstances);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/cancers/instances/patient/{patientId}:
 *   get:
 *     summary: Get cancer instances for a specific class and patient
 *     description: Returns cancer rows where the specified patient appears
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: classUri
 *         schema:
 *           type: string
 *         required: true
 *         description: Class URI
 *     responses:
 *       200:
 *         description: List of matching cancers
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No cancers found for this class and patient
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patient/:patientId", cancersController.getCancersInstancesForPatient);
router.get("/instances/patient/:patientId/patients", cancersController.getCancersInstancesForPatient);

module.exports = router;
