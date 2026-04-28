const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { initBlockchain } = require("./config/blockchain");

// Load environment variables
dotenv.config({ path: "../.env" });
dotenv.config(); // Also check for local .env

const app = express();

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`  ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/batch", require("./routes/batch"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/unit", require("./routes/unit"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Pharma Supply Chain API",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Pharma Supply Chain — Backend API");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Connect to MongoDB
  await connectDB();

  // Initialize blockchain connection
  initBlockchain();

  app.listen(PORT, () => {
    console.log(`\n  🚀 Server running on http://localhost:${PORT}`);
    console.log(`  📡 API base: http://localhost:${PORT}/api`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
}

start().catch(console.error);

module.exports = app;
