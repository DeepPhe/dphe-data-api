const express = require("express");
const router = express.Router();
const omopController = require("../controllers/omop-controller");

/**
 * @openapi
 * /v1/dphe-data/omop/classes:
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
router.get("/classes", omopController.getOmopClasses);

/**
 * @openapi
 * /v1/dphe-data/omop/classes/patients:
 *   get:
 *     summary: Get all supported OMOP classes (patients route alias)
 *     description: Alias of /v1/dphe-data/omop/classes
 *     tags: [OMOP]
 *     responses:
 *       200:
 *         description: List of OMOP class names
 *       500:
 *         description: Internal server error
 */
router.get("/classes/patients", omopController.getOmopClasses);

/**
 * @openapi
 * /v1/dphe-data/omop/instances:
 *   get:
 *     summary: Get all OMOP instances for a specific class
 *     description: Returns OMOP rows from one of the OMOP tables by class (without patientIds)
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
router.get("/instances", omopController.getOmopInstances);

/**
 * @openapi
 * /v1/dphe-data/omop/instances/patients:
 *   get:
 *     summary: Get all OMOP instances for a specific class including patientIds
 *     description: Returns OMOP rows from one of the OMOP tables by class with patientIds
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
 *         description: OMOP class rows with patientIds
 *       400:
 *         description: Missing or invalid required parameters
 *       404:
 *         description: No OMOP rows found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/instances/patients", omopController.getOmopInstances);

/**
 * @openapi
 * /v1/dphe-data/omop/{personid}/{attribute}:
 *   get:
 *     summary: Get OMOP instances for a specific class (legacy path format)
 *     description: Legacy-compatible OMOP route that returns OMOP rows by class (without patientIds)
 *     tags: [OMOP]
 *     parameters:
 *       - in: path
 *         name: personid
 *         schema:
 *           type: string
 *         required: true
 *         description: Person ID
 *       - in: path
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
 *         description: Invalid attribute type
 *       404:
 *         description: No OMOP rows found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/:personid/:attribute", omopController.getOmopAttribute);

/**
 * @openapi
 * /v1/dphe-data/omop/{personid}/{attribute}/patients:
 *   get:
 *     summary: Get OMOP instances for a specific class with patientIds (legacy path format)
 *     description: Legacy-compatible OMOP route that returns OMOP rows by class with patientIds
 *     tags: [OMOP]
 *     parameters:
 *       - in: path
 *         name: personid
 *         schema:
 *           type: string
 *         required: true
 *         description: Person ID
 *       - in: path
 *         name: attribute
 *         schema:
 *           type: string
 *           enum: [AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER]
 *         required: true
 *         description: OMOP class to retrieve
 *     responses:
 *       200:
 *         description: OMOP class rows with patientIds
 *       400:
 *         description: Invalid attribute type
 *       404:
 *         description: No OMOP rows found for this class
 *       500:
 *         description: Internal server error
 */
router.get("/:personid/:attribute/patients", omopController.getOmopAttribute);

module.exports = router;
