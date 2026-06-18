const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filter-controller");
/**
 * @openapi
 * /v1/deepphe-api/deepphe/filter/count:
 *   post:
 *     summary: Count patients matching multi-criteria filters
 *     description: |
 *       Accepts an array of filter items.  Each item specifies a data type
 *       (omop, attributes, cancers, concepts), a class within that type,
 *       and one or more instance values.
 *
 *       **Within** an item the instances are OR'd: a patient matches if they
 *       have *any* of the listed values.
 *
 *       **Across** items the results are AND'd: a patient must satisfy
 *       *every* filter item.
 *
 *       Timing metrics are always returned so callers can monitor performance.
 *     tags: [Filter]
 *     parameters:
 *       - in: query
 *         name: includePatientIds
 *         schema:
 *           type: boolean
 *           default: false
 *         description: When true, also return the list of matching patient IDs
 *       - in: query
 *         name: autoIncludeThreshold
 *         schema:
 *           type: integer
 *           default: 20
 *         description: |
 *           Automatically include patient IDs when the matching count is
 *           below this threshold, even when includePatientIds is false.
 *           Set to 0 to disable auto-inclusion.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filters]
 *             properties:
 *               filters:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [type, class, instances]
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [omop, attributes, cancers, concepts]
 *                     class:
 *                       type: string
 *                     instances:
 *                       type: array
 *                       minItems: 1
 *                       items:
 *                         type: string
 *           example:
 *             filters:
 *               - type: omop
 *                 class: RACE
 *                 instances: ["White", "Black"]
 *               - type: omop
 *                 class: CANCER
 *                 instances: ["B"]
 *               - type: attributes
 *                 class: Behavior
 *                 instances: ["Benign", "Invasive"]
 *     responses:
 *       200:
 *         description: Patient count with timing metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 patient_ids:
 *                   type: array
 *                   items:
 *                     type: string
 *                 timing:
 *                   type: object
 *                   properties:
 *                     queryMs:
 *                       type: number
 *                     bitmapMs:
 *                       type: number
 *                     resolveMs:
 *                       type: number
 *                     totalMs:
 *                       type: number
 *                     itemCounts:
 *                       type: array
 *                       items:
 *                         type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/count", filterController.getFilteredPatientCount);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/filter/count/batch:
 *   post:
 *     summary: Batch count patients for multiple independent filter queries
 *     description: |
 *       Accepts an array of independent filter queries and returns a result for
 *       each in positional order.  All queries are executed concurrently on the
 *       server, replacing N sequential HTTP round trips with a single request.
 *
 *       Each query uses the same filter schema as POST /count.  Per-query errors
 *       are captured and returned inline rather than failing the entire batch.
 *     tags: [Filter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [queries]
 *             properties:
 *               queries:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required: [filters]
 *                   properties:
 *                     filters:
 *                       type: array
 *                       minItems: 1
 *                       items:
 *                         type: object
 *                         required: [type, class, instances]
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [omop, attributes, cancers, concepts]
 *                           class:
 *                             type: string
 *                           instances:
 *                             type: array
 *                             minItems: 1
 *                     includePatientIds:
 *                       type: boolean
 *                       default: false
 *                     autoIncludeThreshold:
 *                       type: integer
 *                       default: 20
 *     responses:
 *       200:
 *         description: Array of per-query results in positional order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                       patient_ids:
 *                         type: array
 *                         items:
 *                           type: string
 *                       timing:
 *                         type: object
 *                       error:
 *                         type: string
 *                         description: Present only when this individual query failed
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/count/batch", filterController.getBatchFilteredPatientCount);

/**
 * @openapi
 * /v1/deepphe-api/deepphe/filter/summary:
 *   post:
 *     summary: Get patient summaries for a list of patient IDs
 *     description: |
 *       Accepts a set of patient IDs and returns matching patient summaries
 *       from patient_summaries with uncompressed json_text payloads.
 *     tags: [Filter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_ids]
 *             properties:
 *               patient_ids:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: number
 *     responses:
 *       200:
 *         description: List of patient summaries with uncompressed json_text
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   patient_id:
 *                     type: string
 *                   json_text:
 *                     type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/summary", filterController.getPatientSummaries);
module.exports = router;
