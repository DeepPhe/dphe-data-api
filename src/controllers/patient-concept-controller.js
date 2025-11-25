const { db } = require('../db');

/**
 * Get concepts for a patient
 * Returns an array of Concept objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.patientId - Patient ID (required)
 * @param {Object} res - Express response object
 * @returns {Promise<Concept[]>} Array of Concept objects
 */
exports.getConcepts = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'Missing required parameter: patientId' });
    }

    // Construct the filename key for concepts
    const key = `${patientId}_Concepts.json`;

    // Retrieve concepts from the database
    const conceptsData = await db.get(key);

    if (!conceptsData) {
      return res.status(404).json({ error: 'Concepts not found for this patient' });
    }

    // Extract concepts array from the "concepts" key
    /** @type {Concept[]} */
    const concepts = conceptsData.concepts && Array.isArray(conceptsData.concepts)
      ? conceptsData.concepts
      : [];

    res.status(200).json(concepts);
  } catch (error) {
    console.error('Error fetching concepts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get concept relations for a patient
 * Returns an array of ConceptRelation objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.query.patientId - Patient ID (required)
 * @param {Object} res - Express response object
 * @returns {Promise<ConceptRelation[]>} Array of ConceptRelation objects
 */
exports.getConceptRelations = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'Missing required parameter: patientId' });
    }

    // Construct the filename key for concepts (same file contains both concepts and conceptRelations)
    const key = `${patientId}_Concepts.json`;

    // Retrieve data from the database
    const conceptsData = await db.get(key);

    if (!conceptsData) {
      return res.status(404).json({ error: 'Concept relations not found for this patient' });
    }

    // Extract conceptRelations array from the "conceptRelations" key
    /** @type {ConceptRelation[]} */
    const conceptRelations = conceptsData.conceptRelations && Array.isArray(conceptsData.conceptRelations)
      ? conceptsData.conceptRelations
      : [];

    res.status(200).json(conceptRelations);
  } catch (error) {
    console.error('Error fetching concept relations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};