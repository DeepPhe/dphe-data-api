const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const dpheRoutes = require("./routes/dphe-data-routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve the pre-built spec directly - do NOT call swaggerJsdoc again
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve the raw JSON to verify what's actually being sent
app.get("/openapi.json", (req, res) => {
  res.json(swaggerSpec);
});

// Routes
app.use("/v1/dphe-data/", dpheRoutes);

module.exports = app;