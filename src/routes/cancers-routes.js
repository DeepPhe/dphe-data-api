const express = require("express");
const router = express.Router();
const cancersController = require("../controllers/cancers-controller");
const summaryController = require("../controllers/summary-controller");

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
 * /v1/deepphe-api/deepphe/cancers/summary:
 *   get:
 *     summary: Get all cancer classes and instances in one response
 *     description: Returns cancer classes with instances grouped by class, with optional patient identifier data
 *     tags: [DeepPhe]
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
 *         description: Cancer summary payload
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
router.get("/summary", summaryController.getCancersSummary);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/cancers/instances:
 *   get:
 *     summary: Get all cancer instances for a specific class
 *     description: Returns list of cancer objects for a specific class (without patient identifier arrays)
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
 *     summary: Get all cancer instances for a specific class including patient identifiers
 *     description: Returns list of cancer objects for a specific class with patient identifier arrays
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
 *         description: List of cancers with patient identifier arrays
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
