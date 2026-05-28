require("dotenv").config();

const cors = require("cors");
const express = require("express");


const redisClient = require("./src/redisclient");
const leaderboardRoutes = require("./src/routes/leaderboard");

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 3000;

app.use(cors());
app.use(express.json());



const swaggerUi = require('swagger-ui-express');

let swaggerDocument = {};
try {
    swaggerDocument = require('./swagger-output.json');
} catch (error) {
    console.error("error in loading swagger document: ", error)
}

// Health endpoint for API + Redis status.
app.get("/health", async (_req, res) => {
  try {
    const pingResult = await redisClient.ping();
    const redisInfo = await redisClient.info("server");
    const versionMatch = redisInfo.match(/redis_version:([\d.]+)/);
    const redisVersion = versionMatch ? versionMatch[1] : "unknown";

    res.json({
      status: "ok",
      redis: pingResult === "PONG" ? "connected" : "error",
      version: redisVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({ status: "error", error: error.message });
  }
});

app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `${req.method} ${req.path} not found`,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ success: false, error: "Internal server error" });
});

async function startServer() {
  await redisClient.connect();

  app.listen(port, () => {
    console.log("Leaderboard API started");
    console.log(`Server: http://localhost:${port}`);
    console.log("Health: GET /health");
    console.log("Leaderboard: GET /api/leaderboard");
    console.log(`Swagger docs is available at http://localhost:${port}/api-docs`);
  });
}

startServer().catch((error) => {
  console.error("Startup error:", error.message);
  process.exit(1);
});
