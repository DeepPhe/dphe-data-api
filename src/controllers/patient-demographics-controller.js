const { db, MySQLClient } = require("../db");
const categoryCache = require("../cache/category-cache");
const zlib = require("zlib");
const { promisify } = require("util");

const gzip = promisify(zlib.gzip);

/**
 * Helper function to send response with optional compression
 */
async function sendResponse(res, data, shouldCompress) {
  if (shouldCompress) {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = await gzip(jsonString);

      res.set({
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "X-Original-Size": Buffer.byteLength(jsonString),
        "X-Compressed-Size": compressed.length,
        "X-Compression-Ratio":
          ((compressed.length / Buffer.byteLength(jsonString)) * 100).toFixed(
            2
          ) + "%",
      });

      return res.status(200).send(compressed);
    } catch (error) {
      console.error("Compression error:", error);
      // Fallback to uncompressed if compression fails
      return res.status(200).json(data);
    }
  }

  return res.status(200).json(data);
}

/**
 * Get demographics for a patient
 */
exports.getDemographics = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({
        error: "Missing required parameter: patientId",
      });
    }

    // Query RocksDB for patient demographics
    const key = `patient:${patientId}:demographics`;
    const demographics = await db.get(key);

    if (!demographics) {
      return res.status(404).json({
        error: "Demographics not found for the specified patient",
      });
    }

    res.status(200).json(demographics);
  } catch (error) {
    console.error("Error fetching demographics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get patients filtered by demographic category
 * Accepts a category type (GENDER, RACE, or ETHNICITY) as a query parameter
 * Optional countOnly parameter returns counts instead of patient ID arrays
 * Optional limit parameter limits the number of patient IDs returned per category (prevents browser freezing)
 * Optional compress parameter returns gzipped JSON response (70-90% smaller)
 * Returns an object with category values as keys and arrays of patient IDs (or counts) as values
 * Example: ?category=GENDER returns {"GENDER.M": ["PAT1"], "GENDER.F": ["PAT2"]}
 * Example: ?category=GENDER&countOnly=true returns {"GENDER.M": 150, "GENDER.F": 120}
 * Example: ?category=GENDER&limit=100 returns max 100 patient IDs per category
 * Example: ?category=GENDER&compress=true returns gzipped response (all data, small size)
 */
exports.getPatientsByCategories = async (req, res) => {
  try {
    const { category, countOnly, limit, compress } = req.query;

    if (!category) {
      return res.status(400).json({
        error: "Missing required query parameter: category",
      });
    }

    // Validate category type
    const validCategories = ["GENDER", "RACE", "ETHNICITY"];
    const upperCategory = category.toUpperCase();

    if (!validCategories.includes(upperCategory)) {
      return res.status(400).json({
        error: `Invalid category: ${category}. Must be one of: ${validCategories.join(
          ", "
        )}`,
      });
    }

    // Parse countOnly parameter (defaults to false)
    const includePatients = countOnly !== "true" && countOnly !== "1";

    // Parse limit parameter (default: 1000, max: 10000)
    let limitValue = null;
    if (limit) {
      limitValue = Math.min(parseInt(limit, 10) || 1000, 10000);
      if (isNaN(limitValue)) {
        limitValue = 1000;
      }
    }

    // Parse compress parameter
    const shouldCompress = compress === "true" || compress === "1";

    // Try to get from cache first
    let cachedData = categoryCache.get(upperCategory, includePatients);

    if (cachedData) {
      // If requesting full patient IDs without limit, warn about large response
      if (includePatients && !limitValue) {
        // Calculate total patients
        const totalPatients = Object.values(cachedData).reduce(
          (sum, patients) => sum + patients.length,
          0
        );

        // If more than 10k patients, strongly recommend using countOnly or limit
        if (totalPatients > 10000) {
          console.warn(
            `⚠️  Large response warning: Returning ${totalPatients} patient IDs. ` +
              `Consider using countOnly=true or limit parameter for better performance.`
          );

          // Add metadata to response
          const responseWithMetadata = {
            _metadata: {
              warning:
                "Large response detected. Consider using countOnly=true, limit parameter, or compress=true.",
              totalPatients,
              recommendation: `Use ?category=${upperCategory}&countOnly=true for counts only`,
              alternativeWithLimit: `Use ?category=${upperCategory}&limit=1000 to limit results`,
              alternativeCompressed: `Use ?category=${upperCategory}&compress=true for gzipped response`,
            },
            data: cachedData,
          };

          return sendResponse(res, responseWithMetadata, shouldCompress);
        }
      }

      // Apply limit if specified and we have patient arrays
      if (includePatients && limitValue && cachedData) {
        const limitedData = {};
        let totalReturned = 0;
        let totalAvailable = 0;

        for (const [key, patients] of Object.entries(cachedData)) {
          totalAvailable += patients.length;
          limitedData[key] = patients.slice(0, limitValue);
          totalReturned += limitedData[key].length;
        }

        // Add metadata about limiting
        const responseWithMetadata = {
          _metadata: {
            limited: true,
            limit: limitValue,
            totalReturned,
            totalAvailable,
            compressed: shouldCompress,
            message: `Showing first ${limitValue} patients per category. Use countOnly=true for full counts.`,
          },
          data: limitedData,
        };

        return sendResponse(res, responseWithMetadata, shouldCompress);
      }

      // Cache hit - return immediately
      return sendResponse(res, cachedData, shouldCompress);
    }

    // Cache miss - fall back to database query
    console.warn(
      `Cache miss for category: ${upperCategory}, includePatients: ${includePatients}`
    );

    const mysqlClient = new MySQLClient();
    await mysqlClient.connect();

    try {
      // Fetch all patients for the specified category
      const patientsByCategory = await mysqlClient.getPatientsByCategory(
        upperCategory,
        includePatients
      );

      return sendResponse(res, patientsByCategory, shouldCompress);
    } finally {
      await mysqlClient.close();
    }
  } catch (error) {
    console.error("Error fetching patients by categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
