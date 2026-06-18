const { getInstance } = require('../db/sqlite-client');
const { createGroupControllers } = require('./group-controller-factory');

/**
 * Get the _Concepts.json file for a specific patient
 *
 * @param {string} req.params.patientId - Patient ID (required)
 * @returns {Promise<Object>} Parsed concepts JSON
 */
exports.getPatientConceptsFile = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ error: 'Missing required parameter: patientId' });
    }

    const db = getInstance();
    await db.open();

    const data = await db.getPatientConcepts(patientId);

    if (data === null || data === undefined) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching patient concepts file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const groupControllers = createGroupControllers({
  queryParam: 'dpheGroup',
  resourceName: 'concept',
  classMethod: 'getConceptsClasses',
  instancesMethod: 'getConceptsInstances',
  patientInstancesMethod: 'getConceptsInstancesForPatient',
});

exports.getConceptsClasses = groupControllers.getClasses;
exports.getConceptsInstances = groupControllers.getInstances;
exports.getConceptsInstancesForPatient = groupControllers.getInstancesForPatient;
