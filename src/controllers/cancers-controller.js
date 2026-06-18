const { getInstance } = require('../db/sqlite-client');
const { createGroupControllers } = require('./group-controller-factory');

/**
 * Get the _Cancers.json file for a specific patient
 *
 * @param {string} req.params.patientId - Patient ID (required)
 * @returns {Promise<Object>} Parsed cancers JSON
 */
exports.getPatientCancersFile = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ error: 'Missing required parameter: patientId' });
    }

    const db = getInstance();
    await db.open();

    const data = await db.getPatientCancers(patientId);

    if (data === null || data === undefined) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching patient cancers file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const groupControllers = createGroupControllers({
  queryParam: 'classUri',
  resourceName: 'cancer',
  classMethod: 'getCancersClasses',
  instancesMethod: 'getCancersInstances',
  patientInstancesMethod: 'getCancersInstancesForPatient',
});

exports.getCancersClasses = groupControllers.getClasses;
exports.getCancersInstances = groupControllers.getInstances;
exports.getCancersInstancesForPatient = groupControllers.getInstancesForPatient;
