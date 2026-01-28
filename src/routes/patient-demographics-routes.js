const express = require("express");
const router = express.Router();
const patientDemographicsController = require("../controllers/patient-demographics-controller");

/**
 * @openapi
 * /v1/dphe-data/cohort/filter/categories/patients:
 *   get:
 *     summary: Get patients filtered by demographic category
 *     description: |
 *       For the given category (GENDER, RACE, or ETHNICITY), returns arrays of patient IDs for each category value.
 *     tags: [Demographics]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [GENDER, RACE, ETHNICITY]
 *         required: true
 *         description: The demographic category to filter by
 *         example: GENDER
 *       - in: query
 *         name: countOnly
 *         schema:
 *           type: boolean
 *         required: false
 *         description: |
 *           If true, returns counts instead of patient ID arrays.
 *
 *         example: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *         required: false
 *         description: Maximum number of patient IDs to return per category (prevents browser freezing).
 *         example: 1000
 *       - in: query
 *         name: compress
 *         schema:
 *           type: boolean
 *         required: false
 *         description: If true, returns response as gzipped JSON (dramatically reduces size). Response will have Content-Encoding gzip header.
 *         example: true
 *     responses:
 *       200:
 *         description: Object with category values as keys and patient ID arrays (or counts if countOnly=true) as values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: integer
 *             examples:
 *               countOnly:
 *                 summary: Count only (RECOMMENDED - countOnly=true)
 *                 value:
 *                   GENDER.M: 8846
 *                   GENDER.F: 69538
 *                   GENDER.U: 15
 *               withLimit:
 *                 summary: With limit (Safe for browsers - limit=100)
 *                 value:
 *                   _metadata:
 *                     limited: true
 *                     limit: 100
 *                     totalReturned: 115
 *                     totalAvailable: 78399
 *                     message: "Showing first 100 patients per category. Use countOnly=true for full counts."
 *                   data:
 *                     GENDER.M: ["9555534801", "9555457322", "..."]
 *                     GENDER.F: ["9555555481", "9555555879", "..."]
 *                     GENDER.U: ["9557213068", "9557734035", "..."]
 *               compressed:
 *                 summary: Compressed response (SAFE - compress=true)
 *                 value:
 *                   _note: "Response is gzipped. ~70-90% smaller than uncompressed."
 *                   _headers:
 *                     Content-Encoding: "gzip"
 *                     X-Original-Size: "357890"
 *                     X-Compressed-Size: "45123"
 *                     X-Compression-Ratio: "12.6%"
 *               withPatients:
 *                 summary: Full patient IDs (⚠️ WARNING - May freeze browser!)
 *                 value:
 *                   GENDER.M: ["9555534801", "9555457322", "...8846 IDs total..."]
 *                   GENDER.F: ["9555555481", "9555555879", "...69538 IDs total..."]
 *                   GENDER.U: ["9557213068", "9557734035", "...15 IDs total..."]
 *       400:
 *         description: Missing or invalid required parameters
 *       500:
 *         description: Internal server error
 */
router.get(
  "/filter/categories/patients",
  patientDemographicsController.getPatientsByCategories
);

//
// /**
//  * @openapi
//  * /v1/dphe-data/patient/demographics:
//  *   get:
//  *     summary: Get demographics for a patient
//  *     description: Returns list of demographic key-value pairs for a specific patient
//  *     tags: [Demographics]
//  *     parameters:
//  *       - in: query
//  *         name: patientId
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: Patient ID
//  *     responses:
//  *       200:
//  *         description: List of demographic key-value pairs
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 type: object
//  *                 properties:
//  *                   key:
//  *                     type: string
//  *                   value:
//  *                     type: string
//  *       400:
//  *         description: Missing required parameters
//  */
// //router.get("/demographics", patientDemographicsController.getDemographics);

module.exports = router;
