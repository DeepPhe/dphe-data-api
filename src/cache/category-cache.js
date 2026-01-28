/**
 * Category Cache Manager
 * Caches demographic category data to improve response times
 */

const MySQLClient = require("../db/mysql-client");

class CategoryCache {
  constructor() {
    this.cache = {
      withPatients: {}, // Full patient ID arrays
      countsOnly: {}, // Just counts
    };
    this.lastUpdated = null;
    this.isInitialized = false;
    this.refreshInterval = null;
  }

  /**
   * Initialize the cache on server startup
   * Loads all three categories (GENDER, RACE, ETHNICITY) in both modes
   */
  async initialize() {
    console.log("Initializing category cache...");
    const startTime = Date.now();

    try {
      await this.refresh();

      // Set up auto-refresh every 5 minutes
      this.refreshInterval = setInterval(() => {
        this.refresh().catch((error) => {
          console.error("Failed to refresh category cache:", error);
        });
      }, 5 * 60 * 1000); // 5 minutes

      const duration = Date.now() - startTime;
      console.log(`✅ Category cache initialized in ${duration}ms`);
      console.log(`   - Cached categories: GENDER, RACE, ETHNICITY`);
      console.log(`   - Auto-refresh: every 5 minutes`);

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize category cache:", error);
      throw error;
    }
  }

  /**
   * Refresh all cached data
   */
  async refresh() {
    const categories = ["GENDER", "RACE", "ETHNICITY"];
    const mysqlClient = new MySQLClient();

    try {
      await mysqlClient.connect();

      // Load both modes (with patients and counts only) for all categories
      const promises = [];

      for (const category of categories) {
        // With patient IDs
        promises.push(
          mysqlClient.getPatientsByCategory(category, true).then((data) => {
            this.cache.withPatients[category] = data;
          })
        );

        // Count only
        promises.push(
          mysqlClient.getPatientsByCategory(category, false).then((data) => {
            this.cache.countsOnly[category] = data;
          })
        );
      }

      await Promise.all(promises);
      this.lastUpdated = new Date();

      console.log(
        `🔄 Category cache refreshed at ${this.lastUpdated.toISOString()}`
      );
    } catch (error) {
      console.error("Error refreshing category cache:", error);
      throw error;
    } finally {
      await mysqlClient.close();
    }
  }

  /**
   * Get cached data for a category
   * @param {string} category - GENDER, RACE, or ETHNICITY
   * @param {boolean} includePatients - If false, returns counts only
   * @returns {Object} Cached data or null if not found
   */
  get(category, includePatients = true) {
    const upperCategory = category.toUpperCase();

    if (!this.isInitialized) {
      console.warn("Category cache not initialized yet");
      return null;
    }

    const cacheType = includePatients ? "withPatients" : "countsOnly";
    return this.cache[cacheType][upperCategory] || null;
  }

  /**
   * Check if cache has data for a category
   * @param {string} category - GENDER, RACE, or ETHNICITY
   * @param {boolean} includePatients - If false, checks counts only cache
   * @returns {boolean}
   */
  has(category, includePatients = true) {
    const upperCategory = category.toUpperCase();
    const cacheType = includePatients ? "withPatients" : "countsOnly";
    return this.cache[cacheType][upperCategory] !== undefined;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const stats = {
      initialized: this.isInitialized,
      lastUpdated: this.lastUpdated,
      categories: {},
    };

    for (const category of ["GENDER", "RACE", "ETHNICITY"]) {
      const withPatients = this.cache.withPatients[category];
      const countsOnly = this.cache.countsOnly[category];

      if (withPatients) {
        const totalPatients = Object.values(withPatients).reduce(
          (sum, arr) => sum + arr.length,
          0
        );
        stats.categories[category] = {
          groups: Object.keys(withPatients).length,
          totalPatients,
          cached: true,
        };
      } else {
        stats.categories[category] = { cached: false };
      }
    }

    return stats;
  }

  /**
   * Clear the cache and stop auto-refresh
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.cache = { withPatients: {}, countsOnly: {} };
    this.lastUpdated = null;
    this.isInitialized = false;
    console.log("Category cache destroyed");
  }
}

// Singleton instance
const categoryCache = new CategoryCache();

module.exports = categoryCache;
