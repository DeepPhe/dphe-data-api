const { getInstance } = require('../db/sqlite-client');

/**
 * Get all unique concept classes
 * Returns an array of concept class dpheGroup values
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<string[]>} Array of concept class dpheGroup values
 */
exports.getConceptsClasses = async (req, res) => {
  try {
    const db = getInstance();
    await db.open();

    // Retrieve concept classes from the database
    const conceptClasses = await db.getConceptsClasses();

    res.status(200).json(conceptClasses);
  } catch (error) {
    console.error('Error fetching concept classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all concept instances for a specific class
 * Returns an array of concept objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.dpheGroup - DPHE Group (required)
 * @param {boolean} req.path - Append /patients to include patient identifier arrays
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} Array of concept objects
 */
exports.getConceptsInstances = async (req, res) => {
  try {
    const { dpheGroup } = req.query;

    if (!dpheGroup) {
      return res.status(400).json({
        error: 'Missing required parameter: dpheGroup'
      });
    }

    // Include patient IDs only when using the /patients route variant
    const shouldIncludePatientIds = /\/patients\/?$/.test(req.path);

    const db = getInstance();
    await db.open();

    // Retrieve concept instances for the specified class from the database
    const concepts = await db.getConceptsInstances(dpheGroup, shouldIncludePatientIds);

    if (!concepts || concepts.length === 0) {
      return res.status(404).json({
        error: 'No concepts found for this class'
      });
    }

    res.status(200).json(concepts);
  } catch (error) {
    console.error('Error fetching concept instances for class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get concept instances for a specific class and patient
 * Returns only concept rows where the patient appears in the bitmap
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.patientId - Patient ID (required)
 * @param {string} req.query.dpheGroup - DPHE Group (required)
 * @param {string} req.path - Append /patients to include patient identifier arrays
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} Array of concept objects for the patient
 */
exports.getConceptsInstancesForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { dpheGroup } = req.query;

    if (!patientId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientId'
      });
    }

    if (!dpheGroup) {
      return res.status(400).json({
        error: 'Missing required parameter: dpheGroup'
      });
    }

    const includePatientIds = /\/patients\/?$/.test(req.path);

    const db = getInstance();
    await db.open();

    const concepts = await db.getConceptsInstancesForPatient(
      dpheGroup,
      patientId,
      includePatientIds
    );

    if (!concepts || concepts.length === 0) {
      return res.status(404).json({
        error: 'No concepts found for this class and patient'
      });
    }

    res.status(200).json(concepts);
  } catch (error) {
    console.error('Error fetching concept instances for class and patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
