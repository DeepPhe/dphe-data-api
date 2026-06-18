const { getInstance } = require('../db/sqlite-client');

function createGroupControllers({
  queryParam,
  resourceName,
  classMethod,
  instancesMethod,
  patientInstancesMethod,
}) {
  const pluralName = `${resourceName}s`;

  const getClasses = async (req, res) => {
    try {
      const db = getInstance();
      await db.open();

      const classes = await db[classMethod]();
      res.status(200).json(classes);
    } catch (error) {
      console.error(`Error fetching ${resourceName} classes:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const getInstances = async (req, res) => {
    try {
      const className = req.query[queryParam];
      if (!className) {
        return res.status(400).json({
          error: `Missing required parameter: ${queryParam}`,
        });
      }

      const includePatientIds = /\/patients\/?$/.test(req.path);
      const db = getInstance();
      await db.open();

      const instances = await db[instancesMethod](className, includePatientIds);
      if (!instances || instances.length === 0) {
        return res.status(404).json({
          error: `No ${pluralName} found for this class`,
        });
      }

      res.status(200).json(instances);
    } catch (error) {
      console.error(`Error fetching ${resourceName} instances for class:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const getInstancesForPatient = async (req, res) => {
    try {
      const { patientId } = req.params;
      const className = req.query[queryParam];

      if (!patientId) {
        return res.status(400).json({
          error: 'Missing required parameter: patientId',
        });
      }

      if (!className) {
        return res.status(400).json({
          error: `Missing required parameter: ${queryParam}`,
        });
      }

      const includePatientIds = /\/patients\/?$/.test(req.path);
      const db = getInstance();
      await db.open();

      const instances = await db[patientInstancesMethod](className, patientId, includePatientIds);
      if (!instances || instances.length === 0) {
        return res.status(404).json({
          error: `No ${pluralName} found for this class and patient`,
        });
      }

      res.status(200).json(instances);
    } catch (error) {
      console.error(`Error fetching ${resourceName} instances for class and patient:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  return {
    getClasses,
    getInstances,
    getInstancesForPatient,
  };
}

module.exports = { createGroupControllers };
