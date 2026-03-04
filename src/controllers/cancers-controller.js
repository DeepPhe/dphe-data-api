const { getInstance } = require('../db/sqlite-client');

/**
 * Get all unique cancer classes
 * Returns an array of cancer class classUri values
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<string[]>} Array of cancer class classUri values
 */
exports.getCancersClasses = async (req, res) => {
  try {
    const db = getInstance();
    await db.open();

    // Retrieve cancer classes from the database
    const cancerClasses = await db.getCancersClasses();

    res.status(200).json(cancerClasses);
  } catch (error) {
    console.error('Error fetching cancer classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all cancer instances for a specific class
 * Returns an array of cancer objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.classUri - Class URI (required)
 * @param {boolean} req.path - Append /patients to include patientIds
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} Array of cancer objects
 */
exports.getCancersInstances = async (req, res) => {
  try {
    const { classUri } = req.query;

    if (!classUri) {
      return res.status(400).json({
        error: 'Missing required parameter: classUri'
      });
    }

    // Include patient IDs only when using the /patients route variant
    const shouldIncludePatientIds = /\/patients\/?$/.test(req.path);

    const db = getInstance();
    await db.open();

    // Retrieve cancer instances for the specified class from the database
    const cancers = await db.getCancersInstances(classUri, shouldIncludePatientIds);

    if (!cancers || cancers.length === 0) {
      return res.status(404).json({
        error: 'No cancers found for this class'
      });
    }

    res.status(200).json(cancers);
  } catch (error) {
    console.error('Error fetching cancer instances for class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
