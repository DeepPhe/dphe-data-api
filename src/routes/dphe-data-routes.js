const express = require("express");
const router = express.Router();

// Import all route modules
const patientDocumentRoutes = require("./patient-document-routes");
const patientConceptRoutes = require("./patient-concept-routes");
const patientFilterRoutes = require("./patient-filter-routes");
const attributesRoutes = require("./attributes-routes");
const cancersRoutes = require("./cancers-routes");
const conceptsRoutes = require("./concepts-routes");
const omopRoutes = require("./omop-routes");

// Use route modules
router.use("/deepphe/patient", patientDocumentRoutes);
router.use("/deepphe/patient", patientConceptRoutes);
router.use("/deepphe/cohort", patientFilterRoutes);
router.use("/deepphe/attributes", attributesRoutes);
router.use("/deepphe/cancers", cancersRoutes);
router.use("/deepphe/concepts", conceptsRoutes);
router.use("/omop", omopRoutes);

module.exports = router;
