const express = require("express");
const router = express.Router();
const patientFilterController = require("../controllers/patient-filter-controller");

/**
 * @openapi
 * /v1/dphe-data/cohort/filter/categories:
 *   get:
 *     summary: Get all filter categories
 *     description: Returns list of all possible categories
 *     tags: [Cohort]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["GENDER.M", "GENDER.F", "GENDER.U"]
 *       500:
 *         description: Internal server error
 */
router.get("/filter/categories", patientFilterController.getFilterCategories);

/**
 * @openapi
 * /v1/dphe-data/cohort/filter/categories/patients:
 *   post:
 *     summary: Get patients by filter categories
 *     description: Returns patients grouped by the given categories
 *     tags: [Cohort]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               categories: ["GENDER.M", "GENDER.F", "GENDER.U"]
 *     responses:
 *       200:
 *         description: Patients grouped by categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               GENDER.M: ["PAT1", "PAT3", "PAT4"]
 *               GENDER.F: ["PAT2", "PAT5"]
 *               GENDER.U: ["PAT6"]
 *       400:
 *         description: Missing or invalid parameters
 */
router.post("/filter/categories/patients", patientFilterController.getPatientsByCategories);

module.exports = router;

