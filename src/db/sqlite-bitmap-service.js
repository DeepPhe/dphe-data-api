const fs = require('fs');
const roaring = require('roaring');
const { assertDatabaseOpen } = require('./sqlite-operations');

const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;

class SQLiteBitmapService {
    constructor(client) {
        this.client = client;
    }

    async decodeBitmap(source, sourceType = 'file') {
        let buffer;

        if (sourceType === 'file') {
            if (typeof source !== 'string') {
                throw new Error('File path must be a string');
            }
            buffer = fs.readFileSync(source);
        } else if (sourceType === 'base64') {
            if (typeof source !== 'string') {
                throw new Error('Base64 data must be a string');
            }
            buffer = Buffer.from(source, 'base64');
        } else if (sourceType === 'buffer') {
            if (!Buffer.isBuffer(source)) {
                throw new Error('Source must be a Buffer when sourceType is "buffer"');
            }
            buffer = source;
        } else if (sourceType === 'blob') {
            if (Buffer.isBuffer(source)) {
                buffer = source;
            } else if (source instanceof Uint8Array) {
                buffer = Buffer.from(source);
            } else {
                throw new Error('Blob source must be a Buffer or Uint8Array');
            }
        } else {
            throw new Error(
                'Invalid sourceType. Must be "file", "buffer", "base64", or "blob"'
            );
        }

        try {
            return roaring.RoaringBitmap32.deserialize(buffer, false);
        } catch (portableError) {
            try {
                return roaring.RoaringBitmap32.deserialize(buffer, true);
            } catch (_) {
                throw portableError;
            }
        }
    }

    getPatientBitmapSource(row) {
        let source;
        let sourceType;

        if (row.patient_bitmap !== null && row.patient_bitmap !== undefined) {
            source = row.patient_bitmap;
            sourceType = 'blob';
        } else if (row.patientbitmap !== null && row.patientbitmap !== undefined) {
            source = row.patientbitmap;
            sourceType = 'base64';
        } else {
            return null;
        }

        if (sourceType === 'base64' && Buffer.isBuffer(source)) {
            const text = source.toString('utf8');
            if (BASE64_PATTERN.test(text)) {
                source = text;
            } else {
                sourceType = 'blob';
            }
        }

        return { source, sourceType };
    }

    async processPatientBitmapRow(row, includePatientIds = false) {
        const processedRow = { ...row };
        const bitmapSource = this.client.getPatientBitmapSource(processedRow);

        delete processedRow.patient_bitmap;
        delete processedRow.patientbitmap;

        if (includePatientIds && bitmapSource) {
            processedRow.patient_ids = await this.client.patientBitmapToPatientIds(
                bitmapSource.source,
                bitmapSource.sourceType
            );
        }

        return processedRow;
    }

    async processPatientBitmapRows(rows, includePatientIds = false) {
        return Promise.all(
            rows.map((row) =>
                this.client.processPatientBitmapRow(row, includePatientIds)
            )
        );
    }

    async filterRowsByPatientId(rows, patientId, includePatientIds = false) {
        assertDatabaseOpen(this.client);

        const sequentialId = await this.client.getSequentialIdForPatient(patientId);
        if (sequentialId === null || sequentialId === undefined) {
            return [];
        }

        const matchingRows = [];
        for (const row of rows) {
            const bitmapSource = this.client.getPatientBitmapSource(row);
            if (!bitmapSource) {
                continue;
            }

            const bitmap = await this.client.decodeBitmap(
                bitmapSource.source,
                bitmapSource.sourceType
            );
            if (bitmap.has(sequentialId)) {
                matchingRows.push(
                    await this.client.processPatientBitmapRow(
                        row,
                        includePatientIds
                    )
                );
            }
        }

        return matchingRows;
    }

    async patientBitmapToPatientIds(source, sourceType = 'file') {
        assertDatabaseOpen(this.client);

        if (source === null || source === undefined) {
            return [];
        }

        const validSourceTypes = new Set(['file', 'buffer', 'base64', 'blob']);
        if (!validSourceTypes.has(sourceType)) {
            throw new Error('Invalid sourceType. Must be "file", "buffer", or "base64"');
        }

        let effectiveSource = source;
        let effectiveSourceType = sourceType;
        if (Buffer.isBuffer(source) && sourceType === 'base64') {
            const text = source.toString('utf8');
            if (BASE64_PATTERN.test(text)) {
                effectiveSource = text;
            } else {
                effectiveSourceType = 'blob';
            }
        }

        if (effectiveSourceType === 'base64' && typeof effectiveSource !== 'string') {
            return [];
        }

        let sequentialIds;
        try {
            const bitmap = await this.client.decodeBitmap(
                effectiveSource,
                effectiveSourceType
            );
            sequentialIds = bitmap.toArray();
        } catch (error) {
            throw new Error(`Failed to decode bitmap: ${error.message}`);
        }

        if (sequentialIds.length === 0) {
            return [];
        }

        const patientIdsBySequentialId = {};
        for (let index = 0; index < sequentialIds.length; index += 900) {
            const chunk = sequentialIds.slice(index, index + 900);
            const placeholders = chunk.map(() => '?').join(',');
            const rows = await this.client.getAllRows(
                `SELECT sequential_id, patient_id FROM patient_id_mapping WHERE sequential_id IN (${placeholders})`,
                chunk
            );

            rows.forEach((row) => {
                patientIdsBySequentialId[row.sequential_id] = row.patient_id;
            });
        }

        return sequentialIds.map((sequentialId) => {
            return patientIdsBySequentialId[sequentialId] !== undefined
                ? patientIdsBySequentialId[sequentialId]
                : 'missing';
        });
    }
}

module.exports = {
    SQLiteBitmapService
};
