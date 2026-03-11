const app = require("./src/app");
const { initializeDatabase, closeDatabase } = require("./src/db");

const port = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
  try {
    // Initialize RocksDB connection
    await initializeDatabase();

    // Start Express server
    const server = app.listen(port, () => {
      console.log("Hi there!");
      console.log(`dphe-data-api listening on http://localhost:${port}`);
      console.log(`Swagger UI: http://localhost:${port}/docs`);
      console.log(`OpenAPI JSON: http://localhost:${port}/openapi.json`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log("HTTP server closed");
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
