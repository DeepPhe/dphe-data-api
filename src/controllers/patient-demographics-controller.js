const { db } = require('../db');

/**
 * Get demographics for a patient
 */
exports.getDemographics = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientId'
      });
    }

    // Query RocksDB for patient demographics
    const key = `patient:${patientId}:demographics`;
    const demographics = await db.get(key);

    if (!demographics) {
      return res.status(404).json({
        error: 'Demographics not found for the specified patient'
      });
    }

    res.status(200).json(demographics);
  } catch (error) {
    console.error('Error fetching demographics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};