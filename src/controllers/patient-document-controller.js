const { db } = require('../db');

/**
 * Get all documents for a patient
 * Returns a collection of DocumentXn objects
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.patientId - Patient ID from URL path (required)
 * @param {string} [req.query.documentIds] - Comma-separated list of document IDs to filter by
 * @param {string} [req.query.excludeProperties] - Comma-separated list of DocumentXn properties to exclude
 * @param {Object} res - Express response object
 * @returns {Promise<DocumentXn[]>} Array of DocumentXn objects
 */
exports.getDocuments = async (req, res) => {
    const patientId = req.params.patientId;
    const documentIdsParam = req.query.documentIds;
    const excludePropertiesParam = req.query.excludeProperties;

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required"
        });
    }

    // Parse documentIds into an array
    const documentIds = documentIdsParam
        ? documentIdsParam.split(',').map(id => id.trim())
        : [];

    // Parse excludeProperties into an array
    const excludeProperties = excludePropertiesParam
        ? excludePropertiesParam.split(',').map(prop => prop.trim())
        : [];

    // Validate that excluded properties are valid DocumentXn properties
    const validProperties = ['id', 'name', 'type', 'date', 'episode', 'text', 'mentions', 'mentionRelations', 'sections'];
    const invalidProperties = excludeProperties.filter(prop => !validProperties.includes(prop));

    if (invalidProperties.length > 0) {
        return res.status(400).json({
            message: `Invalid properties to exclude: ${invalidProperties.join(', ')}. Valid properties are: ${validProperties.join(', ')}`
        });
    }

    try {
        const prefix = `${patientId}`;

        // Use the existing getByPrefix method to retrieve all patient data
        const results = await db.getByPrefix(prefix);

        // Filter to only include document objects (keys ending in _Doc.json or patientId.json)
        // This excludes sub-resources and ensures we only get DocumentXn objects
        const documentKeys = results.filter(({ key }) => {
            // Match pattern: patientId.json or patientId_*_Doc.json
            return key === `${prefix}.json` || key.match(new RegExp(`^${prefix}_.*_Doc\\.json$`));
        });

        /** @type {DocumentXn[]} */
        let documents = documentKeys.map(({ value }) => {
            // Ensure the document conforms to DocumentXn structure
            const document = {
                id: value.id,
                name: value.name,
                type: value.type,
                date: value.date,
                episode: value.episode,
                text: value.text,
                mentions: value.mentions || [],
                mentionRelations: value.mentionRelations || [],
                sections: value.sections
            };


            // Exclude properties specified in excludeProperties parameter
            excludeProperties.forEach(prop => {
                delete document[prop];
            });

            // Remove undefined fields to keep response clean
            return Object.fromEntries(
                Object.entries(document).filter(([_, v]) => v !== undefined)
            );
        });

        // Filter by documentIds if specified
        if (documentIds.length > 0) {
            documents = documents.filter(doc => documentIds.includes(doc.id));
        }

        res.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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