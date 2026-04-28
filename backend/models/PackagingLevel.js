const mongoose = require("mongoose");

/**
 * PackagingLevel — Hierarchical packaging tracking.
 * Represents boxes and cartons that contain multiple units.
 * Scanning a packaging level cascades status updates to all children.
 *
 * Hierarchy: Carton → Box → Unit
 *   - A carton contains multiple boxes
 *   - A box contains multiple units (individual packets)
 */
const packagingLevelSchema = new mongoose.Schema(
  {
    levelId: {
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
    type: {
      type: String,
      enum: ["box", "carton"],
      required: true,
    },
    parentId: {
      type: String, // Carton ID for boxes, null/empty for cartons
      default: "",
      index: true,
    },
    childCount: {
      type: Number, // Number of direct children (units for box, boxes for carton)
      required: true,
    },
    status: {
      type: String,
      enum: ["created", "in-transit", "at-pharmacy", "dispensed"],
      default: "created",
    },
    qrCodeData: {
      type: String, // Base64 QR code
      default: "",
    },
    scannedAt: {
      type: Date,
      default: null,
    },
    scannedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index for finding children of a parent
packagingLevelSchema.index({ batchId: 1, type: 1 });
packagingLevelSchema.index({ parentId: 1, type: 1 });

module.exports = mongoose.model("PackagingLevel", packagingLevelSchema);
