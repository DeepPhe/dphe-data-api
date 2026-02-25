const app = require("./src/app");
const { initializeDatabase, closeDatabase } = require("./src/db");
const categoryCache = require("./src/cache/category-cache");

const port = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
  try {
    // Initialize RocksDB connection
    await initializeDatabase();

    // Initialize category cache (loads GENDER, RACE, ETHNICITY data)
    // Do this asynchronously so MySQL connection failures don't block server startup
    categoryCache.initialize().catch((error) => {
      console.warn(
        "⚠️  Category cache initialization failed. MySQL may not be running."
      );
      console.warn(
        "   The /cohort/filter/categories/patients endpoint will not work."
      );
      console.warn("   Error details:", error.message);
    });

    // Start Express server
    const server = app.listen(port, () => {
      console.log("Hi there!");
      console.log(`dphe-data-api listening on http://localhost:${port}`);
      console.log(`Swagger UI: http://localhost:${port}/docs`);
      console.log(`OpenAPI JSON: http://localhost:${port}/openapi.json`);

      // Display cache stats
      const stats = categoryCache.getStats();
      console.log("\nCategory Cache Status:");
      console.log(`  Last Updated: ${stats.lastUpdated}`);
      for (const [category, info] of Object.entries(stats.categories)) {
        if (info.cached) {
          console.log(
            `  ${category}: ${info.groups} groups, ${info.totalPatients} patients`
          );
        }
      }
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log("HTTP server closed");
        categoryCache.destroy();
        await closeDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
