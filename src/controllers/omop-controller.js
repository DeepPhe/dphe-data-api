const { getInstance } = require('../db/sqlite-client');
const VALID_OMOP_CLASSES = ['AGE_AT_DX', 'ETHNICITY', 'GENDER', 'RACE', 'CANCER'];

/**
 * Validate and normalize OMOP class name.
 * @param {string} attribute - Requested OMOP class
 * @returns {string|null} Normalized class name or null if invalid
 */
function normalizeOmopClass(attribute) {
  const normalizedAttribute = String(attribute || '').toUpperCase();
  return VALID_OMOP_CLASSES.includes(normalizedAttribute) ? normalizedAttribute : null;
}

/**
 * Shared handler for OMOP instances responses.
 * @param {string} attribute - OMOP class
 * @param {boolean} includePatientIds - Include patient IDs in response
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function respondWithOmopInstances(attribute, includePatientIds, res) {
  const normalizedAttribute = normalizeOmopClass(attribute);

  if (!normalizedAttribute) {
    return res.status(400).json({
      error: `Invalid attribute type. Must be one of: ${VALID_OMOP_CLASSES.join(', ')}`,
    });
  }

  const db = getInstance();
  await db.open();

  const omopInstances = await db.getOmopInstances(normalizedAttribute, includePatientIds);

  if (!omopInstances || omopInstances.length === 0) {
    return res.status(404).json({
      error: 'No OMOP entries found for this class',
    });
  }

  return res.status(200).json(omopInstances);
}

/**
 * Shared handler for OMOP instances responses filtered by patient.
 * @param {string} attribute - OMOP class
 * @param {string} patientId - Patient ID
 * @param {boolean} includePatientIds - Include patient IDs in response
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function respondWithOmopInstancesForPatient(attribute, patientId, includePatientIds, res) {
  const normalizedAttribute = normalizeOmopClass(attribute);

  if (!normalizedAttribute) {
    return res.status(400).json({
      error: `Invalid attribute type. Must be one of: ${VALID_OMOP_CLASSES.join(', ')}`,
    });
  }

  const db = getInstance();
  await db.open();

  const omopInstances = await db.getOmopInstancesForPatient(
    normalizedAttribute,
    patientId,
    includePatientIds,
  );

  if (!omopInstances || omopInstances.length === 0) {
    return res.status(404).json({
      error: 'No OMOP entries found for this class and patient',
    });
  }

  return res.status(200).json(omopInstances);
}

/**
 * Get all supported OMOP classes
 * Returns an array of OMOP class names
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<string[]>} Array of OMOP class names
 */
exports.getOmopClasses = async (req, res) => {
  try {
    const db = getInstance();
    await db.open();

    const omopClasses = await db.getOmopClasses();

    res.status(200).json(omopClasses);
  } catch (error) {
    console.error('Error fetching OMOP classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all OMOP instances for a specific class
 * Returns an array of OMOP rows from one of the OMOP tables
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.attribute - OMOP class (AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER)
 * @param {string} req.path - Append /patients to include patient identifier arrays
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} OMOP class instances
 */
exports.getOmopInstances = async (req, res) => {
  try {
    const { attribute } = req.query;

    if (!attribute) {
      return res.status(400).json({
        error: 'Missing required parameter: attribute',
      });
    }

    const includePatientIds = /\/patients\/?$/.test(req.path);
    return await respondWithOmopInstances(attribute, includePatientIds, res);
  } catch (error) {
    console.error('Error fetching OMOP instances for class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get OMOP instances for a specific OMOP class
 * Returns an array of OMOP rows from one of the OMOP tables
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.attribute - OMOP class (AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER)
 * @param {string} req.path - Append /patients to include patient identifier arrays
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} OMOP class instances
 */
exports.getOmopAttribute = async (req, res) => {
  try {
    const { attribute } = req.params;
    const includePatientIds = /\/patients\/?$/.test(req.path);
    return await respondWithOmopInstances(attribute, includePatientIds, res);
  } catch (error) {
    console.error('Error fetching OMOP attribute:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get OMOP instances for a specific class and patient
 * Returns only OMOP rows where the patient appears in the bitmap
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.patientId - Patient ID (required)
 * @param {string} req.query.attribute - OMOP class (AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER)
 * @param {string} req.path - Append /patients to include patient identifier arrays
 * @param {Object} res - Express response object
 * @returns {Promise<Object[]>} OMOP class instances for the patient
 */
exports.getOmopInstancesForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { attribute } = req.query;

    if (!patientId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientId',
      });
    }

    if (!attribute) {
      return res.status(400).json({
        error: 'Missing required parameter: attribute',
      });
    }

    const includePatientIds = /\/patients\/?$/.test(req.path);
    return await respondWithOmopInstancesForPatient(attribute, patientId, includePatientIds, res);
  } catch (error) {
    console.error('Error fetching OMOP instances for class and patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
