const express = require("express");
const router = express.Router();
const attributesController = require("../controllers/attributes-controller");

/**
 * @openapi
 * /v1/dphe-data/attributes/classes:
 *   get:
 *     summary: Get all unique attribute classes
 *     description: Returns list of unique attribute class names
 *     tags: [Attributes]
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
 * /v1/dphe-data/attributes/instances:
 *   get:
 *     summary: Get all attribute instances for a specific class
 *     description: Returns list of attribute objects for a specific class (without patientIds)
 *     tags: [Attributes]
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
 * /v1/dphe-data/attributes/instances/patients:
 *   get:
 *     summary: Get all attribute instances for a specific class including patientIds
 *     description: Returns list of attribute objects for a specific class with patientIds
 *     tags: [Attributes]
 *     parameters:
 *       - in: query
 *         name: groupname
 *         schema:
 *           type: string
 *         required: true
 *         description: Group name
 *     responses:
 *       200:
 *         description: List of attributes with patientIds
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No attributes found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patients", attributesController.getAttributesInstances);

module.exports = router;
