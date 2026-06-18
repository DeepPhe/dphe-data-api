const express = require('express');
const router = express.Router();

// Import all route modules
const patientDocumentRoutes = require('./patient-document-routes');
const attributesRoutes = require('./attributes-routes');
const cancersRoutes = require('./cancers-routes');
const conceptsRoutes = require('./concepts-routes');
const omopRoutes = require('./omop-routes');
const filterRoutes = require('./filter-routes');

// Use route modules
router.use('/deepphe/patient', patientDocumentRoutes);
router.use('/deepphe/attributes', attributesRoutes);
router.use('/deepphe/cancers', cancersRoutes);
router.use('/deepphe/concepts', conceptsRoutes);
router.use('/deepphe/filter', filterRoutes);
router.use('/omop', omopRoutes);

module.exports = router;
