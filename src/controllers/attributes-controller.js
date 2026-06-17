const { createGroupControllers } = require('./group-controller-factory');

const controllers = createGroupControllers({
  queryParam: 'groupname',
  resourceName: 'attribute',
  classMethod: 'getAttributesClasses',
  instancesMethod: 'getAttributesInstances',
  patientInstancesMethod: 'getAttributesInstancesForPatient'
});

exports.getAttributesClasses = controllers.getClasses;
exports.getAttributesInstances = controllers.getInstances;
exports.getAttributesInstancesForPatient = controllers.getInstancesForPatient;
