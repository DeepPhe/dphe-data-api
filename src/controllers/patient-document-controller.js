const { db } = require('../db');
const VALID_DOCUMENT_PROPERTIES = [
  'id',
  'name',
  'type',
  'date',
  'episode',
  'text',
  'mentions',
  'mentionRelations',
  'sections',
];

/**
 * Parse comma-separated query values into a trimmed array
 * @param {string|undefined} value
 * @returns {string[]}
 */
function parseCsv(value) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

/**
 * Normalize episode values into stable, lowercase buckets
 * @param {string|undefined|null} episode
 * @returns {string}
 */
function normalizeEpisodeType(episode) {
  const normalized = String(episode || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return 'unknown';
  }

  if (normalized.includes('medical') && normalized.includes('decision')) {
    return 'medical decision-making';
  }

  if (normalized.includes('pre') && normalized.includes('diagnostic')) {
    return 'pre-diagnostic';
  }

  if (normalized === 'unknown') {
    return 'unknown';
  }

  if (normalized.includes('diagnostic')) {
    return 'diagnostic';
  }

  if (normalized.includes('treat')) {
    return 'treatment';
  }

  if (normalized.includes('follow')) {
    return 'follow-up';
  }

  return normalized;
}

/**
 * Retrieve and shape documents for a patient
 * @param {string} patientId - Patient ID
 * @param {string[]} documentIds - Optional document ID filter
 * @param {string[]} excludeProperties - Properties to remove from each document
 * @returns {Promise<DocumentXn[]>} Array of documents
 */
async function fetchDocuments(patientId, documentIds = [], excludeProperties = []) {
  const prefix = `${patientId}`;
  const results = await db.getByPrefix(prefix);

  // Filter to only include document objects (keys ending in _Doc.json or patientId.json)
  // This excludes sub-resources and ensures we only get DocumentXn objects
  // Match pattern: patientId.json or patientId_*_Doc.json. Use plain string
  // matching rather than a RegExp built from the (user-supplied) patientId so
  // regex metacharacters in the id can't alter which keys are selected.
  const documentKeys = results.filter(
    ({ key }) =>
      key === `${prefix}.json` || (key.startsWith(`${prefix}_`) && key.endsWith('_Doc.json')),
  );

  /** @type {DocumentXn[]} */
  let documents = documentKeys
    .map(({ value }) => {
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
        sections: value.sections,
      };

      // Keep only records that look like DocumentXn rows.
      // Some {patientId}.json values are metadata rows and should not be treated as documents.
      const hasDocumentShape =
        document.type !== undefined ||
        document.date !== undefined ||
        document.episode !== undefined ||
        document.text !== undefined ||
        Array.isArray(document.sections);
      if (!hasDocumentShape) {
        return null;
      }

      // Exclude properties specified in excludeProperties parameter
      excludeProperties.forEach((prop) => {
        delete document[prop];
      });

      // Remove undefined fields to keep response clean
      return Object.fromEntries(Object.entries(document).filter(([_, v]) => v !== undefined));
    })
    .filter(Boolean);

  // Filter by documentIds if specified
  if (documentIds.length > 0) {
    documents = documents.filter((doc) => documentIds.includes(doc.id));
  }

  return documents;
}

/**
 * Get all documents for a patient
 * Returns a collection of DocumentXn objects
 *
 * @param {string} req.params.patientId - Patient ID from URL path (required)
 * @param {string} [req.query.documentIds] - Comma-separated list of document IDs to filter by
 * @param {string} [req.query.excludeProperties] - Comma-separated list of DocumentXn properties to exclude
 * @returns {Promise<DocumentXn[]>} Array of DocumentXn objects
 */
exports.getDocuments = async (req, res) => {
  const patientId = req.params.patientId;
  const documentIdsParam = req.query.documentIds;
  const excludePropertiesParam = req.query.excludeProperties;

  if (!patientId) {
    return res.status(400).json({
      message: 'Patient ID is required',
    });
  }

  const documentIds = parseCsv(documentIdsParam);
  const excludeProperties = parseCsv(excludePropertiesParam);

  // Validate that excluded properties are valid DocumentXn properties
  const invalidProperties = excludeProperties.filter(
    (prop) => !VALID_DOCUMENT_PROPERTIES.includes(prop),
  );

  if (invalidProperties.length > 0) {
    return res.status(400).json({
      message: `Invalid properties to exclude: ${invalidProperties.join(', ')}. Valid properties are: ${VALID_DOCUMENT_PROPERTIES.join(', ')}`,
    });
  }

  try {
    const documents = await fetchDocuments(patientId, documentIds, excludeProperties);

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get documents for a patient from /patient/{patientId}
 * This endpoint always excludes the "text" field by default and does not support
 * documentIds/excludeProperties query filtering.
 *
 * @param {string} req.params.patientId - Patient ID from URL path (required)
 * @returns {Promise<DocumentXn[]>} Array of DocumentXn objects without text
 */
exports.getPatient = async (req, res) => {
  const patientId = req.params.patientId;
  const documentIdsParam = req.query.documentIds;
  const excludePropertiesParam = req.query.excludeProperties;

  if (!patientId) {
    return res.status(400).json({
      message: 'Patient ID is required',
    });
  }

  if (excludePropertiesParam !== undefined) {
    return res.status(400).json({
      message:
        'excludeProperties is not supported on this endpoint. Use /v1/deepphe-api/deepphe/patient/{patientId}/documents instead.',
    });
  }

  if (documentIdsParam !== undefined) {
    return res.status(400).json({
      message:
        'documentIds is not supported on this endpoint. Use /v1/deepphe-api/deepphe/patient/{patientId}/documents instead.',
    });
  }

  try {
    const documents = await fetchDocuments(patientId, [], ['text']);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching patient documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get episode counts for all patient documents
 *
 * @param {string} req.params.patientId - Patient ID from URL path (required)
 * @param {string} [req.query.documentIds] - Optional comma-separated list of document IDs to filter by
 * @returns {Promise<Object>} Episode-to-count map (e.g., { unknown: 12, treatment: 6 })
 */
exports.getDocumentEpisodeCounts = async (req, res) => {
  const patientId = req.params.patientId;
  const documentIdsParam = req.query.documentIds;

  if (!patientId) {
    return res.status(400).json({
      message: 'Patient ID is required',
    });
  }

  const documentIds = parseCsv(documentIdsParam);

  try {
    const documents = await fetchDocuments(patientId, documentIds, []);
    const episodeCounts = documents.reduce((accumulator, document) => {
      const key = normalizeEpisodeType(document.episode);
      accumulator[key] = Number(accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return res.json(episodeCounts);
  } catch (error) {
    console.error('Error fetching document episode counts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
