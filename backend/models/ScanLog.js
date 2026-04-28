const mongoose = require("mongoose");

const scanLogSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    scannedBy: {
      type: String, // wallet address or user ID
      default: "anonymous",
    },
    scannerRole: {
      type: String,
      default: "unknown",
    },
    location: {
      type: String,
      default: "unknown",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: "",
    },
    verificationResult: {
      type: String,
      enum: ["valid", "invalid", "suspicious", "expired"],
      default: "valid",
    },
  },
  { timestamps: true }
);

// Index for anomaly detection queries
scanLogSchema.index({ batchId: 1, createdAt: -1 });
scanLogSchema.index({ batchId: 1, location: 1 });

module.exports = mongoose.model("ScanLog", scanLogSchema);
