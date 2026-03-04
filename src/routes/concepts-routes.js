const express = require("express");
const router = express.Router();
const conceptsController = require("../controllers/concepts-controller");

/**
 * @openapi
 * /v1/dphe-data/concepts/classes:
 *   get:
 *     summary: Get all unique concept classes
 *     description: Returns list of unique concept class dpheGroup values
 *     tags: [Concepts]
 *     responses:
 *       200:
 *         description: List of concept class dpheGroup values
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error
 */
router.get("/classes", conceptsController.getConceptsClasses);

/**
 * @openapi
 * /v1/dphe-data/concepts/instances:
 *   get:
 *     summary: Get all concept instances for a specific class
 *     description: Returns list of concept objects for a specific class (without patientIds)
 *     tags: [Concepts]
 *     parameters:
 *       - in: query
 *         name: dpheGroup
 *         schema:
 *           type: string
 *         required: true
 *         description: DPHE Group
 *     responses:
 *       200:
 *         description: List of concepts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique identifier for the concept
 *                   dpheGroup:
 *                     type: string
 *                     description: DPHE Group of the concept
 *                   value:
 *                     type: string
 *                     description: Value of the concept
 *                   classUri:
 *                     type: string
 *                     description: URI of the concept class
 *                   negated:
 *                     type: integer
 *                     description: Flag indicating if the concept is negated (0 or 1)
 *                   uncertain:
 *                     type: integer
 *                     description: Flag indicating if the concept is uncertain (0 or 1)
 *                   historic:
 *                     type: integer
 *                     description: Flag indicating if the concept is historic (0 or 1)
 *                   num_patients:
 *                     type: integer
 *                     description: Number of patients with this concept
 *               example:
 *                 - id: 456
 *                   dpheGroup: "Biomarkers"
 *                   value: "HER2"
 *                   classUri: "HER2_Biomarker"
 *                   negated: 0
 *                   uncertain: 0
 *                   historic: 0
 *                   num_patients: 3
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No concepts found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances", conceptsController.getConceptsInstances);

/**
 * @openapi
 * /v1/dphe-data/concepts/instances/patients:
 *   get:
 *     summary: Get all concept instances for a specific class including patientIds
 *     description: Returns list of concept objects for a specific class with patientIds
 *     tags: [Concepts]
 *     parameters:
 *       - in: query
 *         name: dpheGroup
 *         schema:
 *           type: string
 *         required: true
 *         description: DPHE Group
 *     responses:
 *       200:
 *         description: List of concepts with patientIds
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No concepts found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patients", conceptsController.getConceptsInstances);

module.exports = router;
