const { getInstance } = require('../db/sqlite-client');

/**
 * Get all unique attribute classes
 * Returns an array of attribute class names
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<string[]>} Array of attribute class names
 */
exports.getAttributesClasses = async (req, res) => {
  try {
    const db = getInstance();
    await db.open();

    // Retrieve attribute classes from the database
    const attributeClasses = await db.getAttributesClasses();

    res.status(200).json(attributeClasses);
  } catch (error) {
    console.error('Error fetching attribute classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all attribute instances for a specific class
 * Returns an array of attribute objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.groupname - Group name (required)
 * @param {boolean} req.path - Append /patients to include patientIds
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} Array of attribute objects
 */
exports.getAttributesInstances = async (req, res) => {
  try {
    const { groupname } = req.query;

    if (!groupname) {
      return res.status(400).json({
        error: 'Missing required parameter: groupname'
      });
    }

    // Include patient IDs only when using the /patients route variant
    const shouldIncludePatientIds = /\/patients\/?$/.test(req.path);

    const db = getInstance();
    await db.open();

    // Retrieve attribute instances for the specified class from the database
    const attributes = await db.getAttributesInstances(groupname, shouldIncludePatientIds);

    if (!attributes || attributes.length === 0) {
      return res.status(404).json({
        error: 'No attributes found for this class'
      });
    }

    res.status(200).json(attributes);
  } catch (error) {
    console.error('Error fetching attribute instances for class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
