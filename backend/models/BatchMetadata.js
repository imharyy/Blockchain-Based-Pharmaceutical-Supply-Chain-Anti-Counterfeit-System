const mongoose = require("mongoose");

const batchMetadataSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    dosage: {
      type: String,
      default: "",
    },
    composition: {
      type: String,
      default: "",
    },
    sideEffects: {
      type: String,
      default: "",
    },
    manufacturerName: {
      type: String,
      required: true,
    },
    manufacturerAddress: {
      type: String,
      required: true,
    },
    manufactureDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: "tablets",
    },
    qrCodeData: {
      type: String, // Base64 encoded QR code image
      default: "",
    },
    dataHash: {
      type: String, // keccak256 hash stored on-chain for integrity verification
      required: true,
    },
    status: {
      type: String,
      enum: ["created", "in-transit", "delivered", "with-consumer", "recalled"],
      default: "created",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BatchMetadata", batchMetadataSchema);
