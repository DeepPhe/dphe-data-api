// In-memory index over the bitmap tables that the filter path reads.
//
// The database is static while the API serves it (it is only replaced by a full reload, after which
// the API is restarted), so every row is loaded once and each patient bitmap is decoded once. The
// decoded bitmaps are shared by all requests: request code must never dispose them or modify them in
// place (clone first).

const PG_UNDEFINED_TABLE = '42P01';

class FilterIndexTable {
  constructor(tableName, classColumn, valueColumns) {
    this.tableName = tableName;
    this.classColumn = classColumn;
    this.valueColumns = valueColumns;
    // class value (or '' when the table has no class column) -> value -> entries
    this.byClass = new Map();
  }

  add(row, entry) {
    const classKey = this.classColumn ? row[this.classColumn] : '';
    if (classKey === null || classKey === undefined) {
      return; // SQL `col = $1` never matches NULL.
    }

    let byValue = this.byClass.get(String(classKey));
    if (!byValue) {
      byValue = new Map();
      this.byClass.set(String(classKey), byValue);
    }

    for (const columnName of this.valueColumns) {
      const value = row[columnName];
      if (value === null || value === undefined) {
        continue;
      }
      const key = String(value);
      const entries = byValue.get(key);
      if (entries) {
        entries.push(entry);
      } else {
        byValue.set(key, [entry]);
      }
    }
  }

  // Rows whose class equals filterClass and whose value column(s) match any of the instances. Each row
  // appears once even when several of its value columns match. Exact string equality, like text `=`.
  find(filterClass, instances) {
    const classKey = this.classColumn ? filterClass : '';
    if (classKey === null || classKey === undefined) {
      return [];
    }

    const byValue = this.byClass.get(String(classKey));
    if (!byValue) {
      return [];
    }

    const matches = new Set();
    for (const instance of instances) {
      const entries = byValue.get(instance);
      if (entries) {
        for (const entry of entries) {
          matches.add(entry);
        }
      }
    }

    const found = Array.from(matches);
    for (const entry of found) {
      if (entry.error) {
        throw entry.error;
      }
    }
    return found;
  }
}

class FilterIndex {
  constructor() {
    this.tables = new Map();
  }

  getTable(tableName) {
    return this.tables.get(tableName);
  }

  // specs: [{ table, classColumn, valueColumns, optional }]
  static async load(client, specs) {
    const index = new FilterIndex();

    for (const spec of specs) {
      const table = new FilterIndexTable(spec.table, spec.classColumn, spec.valueColumns);
      index.tables.set(spec.table, table);

      let rows;
      try {
        rows = await client.getAllRows(`SELECT * FROM deepphe.${spec.table}`);
      } catch (error) {
        if (spec.optional && error && error.code === PG_UNDEFINED_TABLE) {
          continue; // A missing lookup table behaves as an empty one.
        }
        throw error;
      }

      for (const row of rows) {
        const bitmapSource = client.getPatientBitmapSource(row);
        if (!bitmapSource) {
          continue; // Rows without a bitmap contribute nothing.
        }

        const entry = { bitmap: null, error: null };
        try {
          entry.bitmap = await client.decodeBitmap(bitmapSource.source, bitmapSource.sourceType);
        } catch (error) {
          // The SQL path only fails when a request actually matches the undecodable row; do the same.
          entry.error = error;
        }
        table.add(row, entry);
      }
    }

    return index;
  }
}

module.exports = { FilterIndex };
