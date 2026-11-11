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

function isValidDateParts(year, month, day) {
  return year >= 1900 && year <= 2300 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function normalizeClinicalTimestamp(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  if (digits.length < 8) {
    return '';
  }

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!isValidDateParts(year, month, day)) {
    return '';
  }

  return digits.slice(0, Math.min(digits.length, 12));
}

function extractRunTimestamp(documentId) {
  const match = String(documentId || '').match(/_(\d{14})_D_\d+$/);
  if (!match) {
    return '';
  }

  const digits = match[1];
  const yyyyMMdd = {
    year: Number(digits.slice(0, 4)),
    month: Number(digits.slice(4, 6)),
    day: Number(digits.slice(6, 8)),
  };
  if (isValidDateParts(yyyyMMdd.year, yyyyMMdd.month, yyyyMMdd.day)) {
    return digits.slice(0, 12);
  }

  const ddMMyyyy = {
    year: Number(digits.slice(4, 8)),
    month: Number(digits.slice(2, 4)),
    day: Number(digits.slice(0, 2)),
  };
  if (!isValidDateParts(ddMMyyyy.year, ddMMyyyy.month, ddMMyyyy.day)) {
    return '';
  }

  return `${digits.slice(4, 8)}${digits.slice(2, 4)}${digits.slice(0, 2)}${digits.slice(8, 12)}`;
}

function extractPrincipalDate(documentText) {
  const match = String(documentText || '').match(/Principal\s+Date[^0-9]*(\d{8})\D*(\d{4})/i);
  if (!match) {
    return '';
  }

  return normalizeClinicalTimestamp(`${match[1]}${match[2]}`);
}

function resolveDocumentDate(value) {
  const storedDate = normalizeClinicalTimestamp(value.date);
  const principalDate = extractPrincipalDate(value.text);
  if (!principalDate) {
    return value.date;
  }

  const runTimestamp = extractRunTimestamp(value.id);
  if (!storedDate || (runTimestamp && storedDate === runTimestamp)) {
    return principalDate;
  }

  return value.date;
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
        date: resolveDocumentDate(value),
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
