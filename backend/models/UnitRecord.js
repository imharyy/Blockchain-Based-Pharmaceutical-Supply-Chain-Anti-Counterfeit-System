const mongoose = require("mongoose");

/**
 * UnitRecord — Individual unit (packet) tracking.
 * Each unit belongs to a batch and has a unique serial number.
 * The serial number's hash is included in the batch's on-chain Merkle tree.
 */
const unitRecordSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    unitIndex: {
      type: Number, // Sequential index within the batch (0-based)
      required: true,
    },
    parentBoxId: {
      type: String, // e.g., "BATCH001-B-001"
      index: true,
      default: "",
    },
    parentCartonId: {
      type: String, // e.g., "BATCH001-C-01"
      index: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["created", "in-transit", "at-pharmacy", "dispensed", "recalled"],
      default: "created",
    },
    dispensedAt: {
      type: Date,
      default: null,
    },
    dispensedTo: {
      type: String, // consumer wallet or "anonymous"
      default: "",
    },
    scanCount: {
      type: Number,
      default: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    lastScannedLocation: {
      type: String,
      default: "",
    },
    qrCodeData: {
      type: String, // Base64 QR code (generated on-demand)
      default: "",
    },
    merkleProof: {
      type: [String], // Array of hex strings forming the Merkle proof
      default: [],
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
unitRecordSchema.index({ batchId: 1, status: 1 });
unitRecordSchema.index({ batchId: 1, unitIndex: 1 });

module.exports = mongoose.model("UnitRecord", unitRecordSchema);
