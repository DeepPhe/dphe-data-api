const { db } = require('../db');

/**
 * Get cancer attributes for a patient
 */
exports.getCancerAttributes = async (req, res) => {
  try {
    const { patientId, cancerId } = req.query;

    if (!patientId || !cancerId) {
      return res.status(400).json({
        error: 'Missing required parameters: patientId and cancerId'
      });
    }

    // Query RocksDB for cancer attributes
    const key = `patient:${patientId}:cancer:${cancerId}:attributes`;
    const attributes = await db.get(key);

    if (!attributes) {
      return res.status(404).json({
        error: 'Cancer attributes not found'
      });
    }

    res.status(200).json(attributes);
  } catch (error) {
    console.error('Error fetching cancer attributes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get cancer concepts for a patient
 */
exports.getCancerConcepts = async (req, res) => {
  try {
    const { patientId, cancerId } = req.query;

    if (!patientId || !cancerId) {
      return res.status(400).json({
        error: 'Missing required parameters: patientId and cancerId'
      });
    }

    // Query RocksDB for cancer concepts
    const key = `patient:${patientId}:cancer:${cancerId}:concepts`;
    const concepts = await db.get(key);

    if (!concepts) {
      return res.status(404).json({
        error: 'Cancer concepts not found'
      });
    }

    res.status(200).json(concepts);
  } catch (error) {
    console.error('Error fetching cancer concepts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get cancer mentions for a patient
 */
exports.getCancerMentions = async (req, res) => {
  try {
    const { patientId, cancerId } = req.query;

    if (!patientId || !cancerId) {
      return res.status(400).json({
        error: 'Missing required parameters: patientId and cancerId'
      });
    }

    // Query RocksDB for cancer mentions
    const key = `patient:${patientId}:cancer:${cancerId}:mentions`;
    const mentions = await db.get(key);

    if (!mentions) {
      return res.status(404).json({
        error: 'Cancer mentions not found'
      });
    }

    res.status(200).json(mentions);
  } catch (error) {
    console.error('Error fetching cancer mentions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all cancers for a patient
 */
exports.getCancers = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientId'
      });
    }

    // Query RocksDB for all cancer records using prefix
    const prefix = `patient:${patientId}:cancer:`;
    const results = await db.getByPrefix(prefix);

    // Filter out sub-keys (like :attributes, :concepts, etc.)
    // and only return the main cancer records
    const cancers = results
      .filter(item => {
        const keyParts = item.key.split(':');
        return keyParts.length === 4; // patient:id:cancer:cancerId
      })
      .map(item => item.value);

    res.status(200).json(cancers);
  } catch (error) {
    console.error('Error fetching cancers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};