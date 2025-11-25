const { db } = require('../db');

/**
 * Get all cancers for a patient
 * Returns an array of Cancer objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.patientId - Patient ID (required)
 * @param {Object} res - Express response object
 * @returns {Promise<Cancer[]>} Array of Cancer objects
 */
exports.getCancers = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientId'
      });
    }

    // Construct the filename key for cancers
    const key = `${patientId}_Cancers.json`;

    // Retrieve cancers from the database
    const cancersData = await db.get(key);

    if (!cancersData) {
      return res.status(404).json({
        error: 'Cancers not found for this patient'
      });
    }

    // The cancers data is directly an array of Cancer objects
    /** @type {Cancer[]} */
    const cancers = Array.isArray(cancersData) ? cancersData : [];

    res.status(200).json(cancers);
  } catch (error) {
    console.error('Error fetching cancers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};