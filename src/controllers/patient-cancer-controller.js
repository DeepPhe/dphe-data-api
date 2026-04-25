const { db } = require('../db');

/**
 * Legacy patient cancers controller retained for backward compatibility with tests/tools.
 * GET cancers for a patient ID using {patientId}_Cancers.json payload.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
exports.getCancers = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'Missing required parameter: patientId' });
    }

    const key = `${patientId}_Cancers.json`;
    const cancersData = await db.get(key);

    if (!cancersData) {
      return res.status(404).json({ error: 'Cancers not found for this patient' });
    }

    const cancers = Array.isArray(cancersData.cancers) ? cancersData.cancers : [];
    return res.status(200).json(cancers);
  } catch (error) {
    console.error('Error fetching cancers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
