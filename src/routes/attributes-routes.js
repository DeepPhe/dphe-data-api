const express = require("express");
const router = express.Router();
const attributesController = require("../controllers/attributes-controller");
const summaryController = require("../controllers/summary-controller");

/**
 * @openapi
 * /v1/deepphe-api/deepphe/attributes/classes:
 *   get:
 *     summary: Get all unique attribute classes
 *     description: Returns list of unique attribute class names
 *     tags: [DeepPhe]
 *     responses:
 *       200:
 *         description: List of attribute class names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error
 */
router.get("/classes", attributesController.getAttributesClasses);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/attributes/summary:
 *   get:
 *     summary: Get all attribute classes and instances in one response
 *     description: Returns attribute classes with instances grouped by class, with optional patient identifier data
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
 *         description: Attribute summary payload
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
router.get("/summary", summaryController.getAttributesSummary);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/attributes/instances:
 *   get:
 *     summary: Get all attribute instances for a specific class
 *     description: Returns list of attribute objects for a specific class (without patient identifier arrays)
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: query
 *         name: groupname
 *         schema:
 *           type: string
 *         required: true
 *         description: Group name
 *     responses:
 *       200:
 *         description: List of attributes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique identifier for the attribute
 *                   attribute_name:
 *                     type: string
 *                     description: Name of the attribute class
 *                   value:
 *                     type: string
 *                     description: Value of the attribute
 *                   classUri:
 *                     type: string
 *                     description: URI of the class
 *                   negated:
 *                     type: integer
 *                     description: Flag indicating if the attribute is negated (0 or 1)
 *                   uncertain:
 *                     type: integer
 *                     description: Flag indicating if the attribute is uncertain (0 or 1)
 *                   historic:
 *                     type: integer
 *                     description: Flag indicating if the attribute is historic (0 or 1)
 *                   num_patients:
 *                     type: integer
 *                     description: Number of patients with this attribute
 *               example:
 *                 - id: 894
 *                   attribute_name: "Genes"
 *                   value: "Cyclin-Dependent Kinase Inhibitor 2A"
 *                   classUri: "Cyclin_sub_DependentKinaseInhibitor2A"
 *                   negated: 0
 *                   uncertain: 1
 *                   historic: 0
 *                   num_patients: 1
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No attributes found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances", attributesController.getAttributesInstances);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/attributes/instances/patients:
 *   get:
 *     summary: Get all attribute instances for a specific class including patient identifiers
 *     description: Returns list of attribute objects for a specific class with patient identifier arrays
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: query
 *         name: groupname
 *         schema:
 *           type: string
 *         required: true
 *         description: Group name
 *     responses:
 *       200:
 *         description: List of attributes with patient identifier arrays
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No attributes found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patients", attributesController.getAttributesInstances);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/attributes/instances/patient/{patientId}:
 *   get:
 *     summary: Get attribute instances for a specific class and patient
 *     description: Returns attribute rows where the specified patient appears
 *     tags: [DeepPhe]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *       - in: query
 *         name: groupname
 *         schema:
 *           type: string
 *         required: true
 *         description: Group name
 *     responses:
 *       200:
 *         description: List of matching attributes
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No attributes found for this class and patient
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patient/:patientId", attributesController.getAttributesInstancesForPatient);
router.get("/instances/patient/:patientId/patients", attributesController.getAttributesInstancesForPatient);

module.exports = router;
