const mysql = require("mysql2/promise");

class MySQLClient {
  constructor() {
    this.connection = null;
    this.config = {
      host: process.env.MYSQL_HOST || "localhost",
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    };
  }

  /**
   * Connect to the MySQL database
   */
  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log(`Connected to MySQL database: ${this.config.database}`);
      return this.connection;
    } catch (error) {
      console.error("Failed to connect to MySQL:", error);
      throw error;
    }
  }

  /**
   * Get the database connection
   */
  getConnection() {
    if (!this.connection) {
      throw new Error(
        "Database connection not established. Call connect() first."
      );
    }
    return this.connection;
  }

  /**
   * List all tables in the current database
   */
  async listTables() {
    try {
      const connection = this.getConnection();
      const [rows] = await connection.query("SHOW TABLES");
      const tableKey = `Tables_in_${this.config.database}`;
      const tables = rows.map((row) => row[tableKey]);
      console.log("Tables in database:", tables);
      return tables;
    } catch (error) {
      console.error("Failed to list tables:", error);
      throw error;
    }
  }

  /**
   * Execute a query
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   */
  async query(query, params = []) {
    try {
      const connection = this.getConnection();
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      console.error("Query failed:", error);
      throw error;
    }
  }

  /**
   * Get patients grouped by a demographic category (GENDER, RACE, or ETHNICITY)
   * @param {string} category - The category to group by (GENDER, RACE, or ETHNICITY)
   * @param {boolean} includePatients - If false, returns counts only instead of patient IDs (default: true)
   * @returns {Object} An object with category values as keys and arrays of patient IDs (or counts) as values
   */
  async getPatientsByCategory(category, includePatients = true) {
    try {
      const upperCategory = category.toUpperCase();
      const validCategories = ["GENDER", "RACE", "ETHNICITY"];

      if (!validCategories.includes(upperCategory)) {
        throw new Error(
          `Invalid category: ${category}. Must be one of: ${validCategories.join(
            ", "
          )}`
        );
      }

      // If count-only mode, use a more efficient query
      if (!includePatients) {
        const query = `SELECT ${upperCategory}, COUNT(*) as count FROM CALCULATED_PATIENT_DATA WHERE ${upperCategory} IS NOT NULL GROUP BY ${upperCategory}`;
        const rows = await this.query(query);

        const result = {};
        for (const row of rows) {
          const categoryValue = row[upperCategory];
          const key = `${upperCategory}.${categoryValue}`;
          result[key] = row.count;
        }

        return result;
      }

      // Query the CALCULATED_PATIENT_DATA table for all patients and their category values
      const query = `SELECT PERSON_ID, ${upperCategory} FROM CALCULATED_PATIENT_DATA WHERE ${upperCategory} IS NOT NULL`;
      const rows = await this.query(query);

      // Group patients by category value
      const result = {};
      for (const row of rows) {
        const patientId = row.PERSON_ID.toString();
        const categoryValue = row[upperCategory];
        const key = `${upperCategory}.${categoryValue}`;

        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(patientId);
      }

      return result;
    } catch (error) {
      console.error("Failed to get patients by category:", error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log("MySQL connection closed");
      this.connection = null;
    }
  }
}

module.exports = MySQLClient;
