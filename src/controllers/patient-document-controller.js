
exports.create = (req, res) => {
    const {title, done = false} = req.body || {};
    if (!title) return res.status(400).json({message: "titles is required"});
    const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
    const todo = {id, title, done};
    todos.push(todo);
    res.status(201).json(todo);
};


exports.getDocumentMentionRelations = (req, res) => {
    const {patientId, documentId} = req.query;

    if (!patientId || !documentId) {
        return res.status(400).json({
            message: "patientId and documentId query parameters are required"
        });
    }

    // Mock data - replace with actual data retrieval logic
    const relations = [
        {
            type: "hasAssociatedFinding",
            sourceId: "MENTION123",
            targetId: "MENTION456"
        }
    ];

    res.json(relations);
}

exports.getDocumentSections = (req, res) => {
    const {patientId, documentId} = req.query;

    if (!patientId || !documentId) {
        return res.status(400).json({
            message: "patientId and documentId query parameters are required"
        });
    }

    // Mock data - replace with actual data retrieval logic
    const sections = [
        {
            id: "SECTION123",
            begin: 0,
            end: 100,
            type: "Clinical History"
        },
        {
            id: "SECTION456",
            begin: 101,
            end: 250,
            type: "Findings"
        },
        {
            id: "SECTION789",
            begin: 251,
            end: 350,
            type: "Impression"
        }
    ];

    res.json(sections);
};

// In src/controllers/dphe-patient-document-controller.js

exports.getDocumentConcepts = (req, res) => {
    const {patientId, documentId} = req.query;

    if (!patientId || !documentId) {
        return res.status(400).json({
            message: "patientId and documentId query parameters are required"
        });
    }

    // Mock data - replace with actual data retrieval logic
    const concepts = [
        {
            id: "CONCEPT123",
            code: "C12345",
            preferredName: "Breast Cancer",
            cui: "C0006142",
            tui: "T191",
            semanticType: "Neoplastic Process",
            mentions: ["MENTION123", "MENTION789"]
        },
        {
            id: "CONCEPT456",
            code: "C67890",
            preferredName: "Metastasis",
            cui: "C0027627",
            tui: "T047",
            semanticType: "Disease or Syndrome",
            mentions: ["MENTION456"]
        }
    ];

    res.json(concepts);
};


exports.getDocumentMentions = (req, res) => {
    const {patientId, documentId} = req.query;

    if (!patientId || !documentId) {
        return res.status(400).json({
            message: "patientId and documentId query parameters are required"
        });
    }

    // Mock data - replace with actual data retrieval logic
    const mentions = [
        {
            id: "MENTION123",
            begin: 15,
            end: 25,
            classUri: "http://example.org/ontology/SomeClass",
            negated: false,
            uncertain: false,
            historic: false,
            confidence: 95
        },
        {
            id: "MENTION456",
            begin: 30,
            end: 45,
            classUri: "http://example.org/ontology/AnotherClass",
            negated: true,
            uncertain: false,
            historic: true,
            confidence: 80
        }
    ];

    res.json(mentions);
};

/**
 * Get document properties for a patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDocuments = (req, res) => {
    const patientId = req.params.patientId;
    const includeContent = req.query.includeContent === 'true';

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required"
        });
    }

    // Mock data - replace with actual database query
    const documents = [
        {
            id: "doc123",
            patientId: patientId,
            name: "Progress Note",
            date: "2023-01-15T14:30:00Z",
            type: "Clinical Note",
            source: "EHR",
            status: "final",
            metadata: {
                authorId: "provider456",
                specialty: "Oncology"
            },
            content: includeContent ? "Patient presents with symptoms of..." : undefined
        },
        {
            id: "doc456",
            patientId: patientId,
            name: "Pathology Report",
            date: "2023-01-10T09:15:00Z",
            type: "Pathology",
            source: "Laboratory",
            status: "final",
            metadata: {
                specimenId: "SP789",
                collectionDate: "2023-01-08T10:30:00Z"
            },
            content: includeContent ? "Histopathology findings indicate..." : undefined
        }
    ];

    res.json(documents);
};

exports.getPatientEpisodes = (req, res) => {
    const patientId = req.query.patientId;

    if (!patientId) {
        return res.status(400).json({message: "patientId query parameter is required"});
    }

    // Mock data - replace with actual data retrieval logic
    const episodes = [
        {
            DOCUMENT_ID: "DOC123",
            DOCUMENT_DATE: "2023-05-15",
            PATIENT_ID: patientId
        },
        {
            DOCUMENT_ID: "DOC124",
            DOCUMENT_DATE: "2023-06-20",
            PATIENT_ID: patientId
        }
    ];

    res.json(episodes);
};