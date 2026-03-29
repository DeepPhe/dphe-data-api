const { getInstance } = require('../db/sqlite-client');

/**
 * Parse includePatientIds query param with default=true.
 * @param {string|boolean|undefined} value
 * @returns {boolean}
 */
function parseIncludePatientIds(value) {
  if (value === undefined) {
    return true;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).toLowerCase() === 'true';
}

/**
 * Convert high-resolution elapsed time to milliseconds with 2 decimal places.
 * @param {bigint} start
 * @returns {number}
 */
function getElapsedMs(start) {
  const end = process.hrtime.bigint();
  return Math.round(Number(end - start) / 1e4) / 100;
}

/**
 * Build a summary endpoint handler around a SQLite client method.
 * @param {string} dbMethodName
 * @param {string} errorContext
 * @returns {(req: Object, res: Object) => Promise<void>}
 */
function createSummaryHandler(dbMethodName, errorContext) {
  return async (req, res) => {
    try {
      const includePatientIds = parseIncludePatientIds(req.query.includePatientIds);
      const start = process.hrtime.bigint();

      const db = getInstance();
      await db.open();

      const summary = await db[dbMethodName](includePatientIds);

      return res.status(200).json({
        ...summary,
        timing: {
          totalMs: getElapsedMs(start)
        }
      });
    } catch (error) {
      console.error(`Error in ${errorContext}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

exports.getOmopSummary = createSummaryHandler('getOmopSummary', 'getOmopSummary');
exports.getAttributesSummary = createSummaryHandler('getAttributesSummary', 'getAttributesSummary');
exports.getCancersSummary = createSummaryHandler('getCancersSummary', 'getCancersSummary');
exports.getConceptsSummary = createSummaryHandler('getConceptsSummary', 'getConceptsSummary');
