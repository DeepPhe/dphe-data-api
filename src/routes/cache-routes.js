const express = require("express");
const router = express.Router();
const categoryCache = require("../cache/category-cache");

/**
 * @openapi
 * /v1/dphe-data/cache/status:
 *   get:
 *     summary: Get cache status
 *     description: Returns the current status of the category cache including last update time and statistics
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 initialized:
 *                   type: boolean
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 categories:
 *                   type: object
 *             example:
 *               initialized: true
 *               lastUpdated: "2025-12-16T12:34:56.789Z"
 *               categories:
 *                 GENDER:
 *                   groups: 3
 *                   totalPatients: 78399
 *                   cached: true
 *                 RACE:
 *                   groups: 11
 *                   totalPatients: 78399
 *                   cached: true
 */
router.get("/status", (req, res) => {
  try {
    const stats = categoryCache.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error getting cache status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /v1/dphe-data/cache/refresh:
 *   post:
 *     summary: Manually refresh cache
 *     description: Triggers an immediate refresh of all cached category data
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 refreshed:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post("/refresh", async (req, res) => {
  try {
    await categoryCache.refresh();
    res.status(200).json({
      message: "Cache refreshed successfully",
      refreshed: categoryCache.lastUpdated,
    });
  } catch (error) {
    console.error("Error refreshing cache:", error);
    res.status(500).json({ error: "Failed to refresh cache" });
  }
});

module.exports = router;
