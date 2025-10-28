const express = require("express");
const router = express.Router();

// Import all route modules
const patientDocumentRoutes = require("./patient-document-routes");
const patientConceptRoutes = require("./patient-concept-routes");
const patientCancerRoutes = require("./patient-cancer-routes");
const patientDemographicsRoutes = require("./patient-demographics-routes");
const patientFilterRoutes = require("./patient-filter-routes");

// Use route modules
router.use("/patient", patientDocumentRoutes);
router.use("/patient", patientConceptRoutes);
router.use("/patient", patientCancerRoutes);
router.use("/patient", patientDemographicsRoutes);
router.use("/cohort", patientFilterRoutes);

module.exports = router;
