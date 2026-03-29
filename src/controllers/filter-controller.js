const { getInstance } = require('../db/sqlite-client');

const VALID_TYPES = ['omop', 'attributes', 'cancers', 'concepts'];

/**
 * Validate a single filter item.
 * @param {Object} item
 * @param {number} index - position in the array (for error messages)
 * @returns {string|null} error message or null if valid
 */
function validateFilterItem(item, index) {
  if (!item || typeof item !== 'object') {
    return `filters[${index}] must be an object`;
  }
  if (!VALID_TYPES.includes(item.type)) {
    return `filters[${index}].type must be one of: ${VALID_TYPES.join(', ')}`;
  }
  if (!item.class || typeof item.class !== 'string') {
    return `filters[${index}].class must be a non-empty string`;
  }
  if (!Array.isArray(item.instances) || item.instances.length === 0) {
    return `filters[${index}].instances must be a non-empty array`;
  }
  return null;
}

/**
 * POST /count
 *
 * Accepts an array of filter items, each with { type, class, instances[] }.
 * Within an item, instances are OR'd (patient matches any).
 * Across items, results are AND'd (patient must match all).
 *
 * Query params:
 *   ?includePatientIds=true  — also return the matching patient ID list
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getFilteredPatientCount = async (req, res) => {
  try {
    const { filters } = req.body;

    /* ── Validate request body ──────────────────────────────────── */
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        error: 'Missing required body parameter: filters (must be a non-empty array)'
      });
    }

    for (let i = 0; i < filters.length; i++) {
      const err = validateFilterItem(filters[i], i);
      if (err) {
        return res.status(400).json({ error: err });
      }
    }

    /* ── Execute ────────────────────────────────────────────────── */
    const includePatientIds =
      String(req.query.includePatientIds).toLowerCase() === 'true';

    // Auto-include patient IDs when result count is below this threshold.
    // Callers can override via ?autoIncludeThreshold=<n>  (0 disables).
    const rawThreshold = req.query.autoIncludeThreshold;
    const autoIncludeThreshold =
      rawThreshold !== undefined ? Math.max(0, Number(rawThreshold) || 0) : 20;

    const db = getInstance();
    await db.open();

    const result = await db.getFilteredPatientCount(filters, includePatientIds, autoIncludeThreshold);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getFilteredPatientCount:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /summary
 *
 * Accepts an array of patient IDs and returns a list of patient summaries.
 * The returned json_text is uncompressed UTF-8 text.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array<string|number>} req.body.patientIds - Patient IDs to fetch
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getPatientSummaries = async (req, res) => {
  try {
    const { patient_ids: patientIds } = req.body || {};

    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required body parameter: patient_ids (must be a non-empty array)'
      });
    }

    const invalidTypes = patientIds.filter(
      id => typeof id !== 'string' && typeof id !== 'number'
    );

    if (invalidTypes.length > 0) {
      return res.status(400).json({
        error: 'patient_ids must contain only strings or numbers'
      });
    }

    const normalizedIds = patientIds
      .map(id => String(id).trim())
      .filter(Boolean);

    if (normalizedIds.length === 0) {
      return res.status(400).json({
        error: 'patient_ids must include at least one non-empty ID'
      });
    }

    const db = getInstance();
    await db.open();

    const summaries = await db.getPatientSummariesByPatientIds(normalizedIds);
    return res.status(200).json(summaries);
  } catch (error) {
    console.error('Error in getPatientSummaries:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
