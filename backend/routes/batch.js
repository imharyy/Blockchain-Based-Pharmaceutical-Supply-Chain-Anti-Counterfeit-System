const express = require("express");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const BatchMetadata = require("../models/BatchMetadata");
const User = require("../models/User");
const { generateQRCode } = require("../services/qrService");
const {
  createBatchOnChain,
  transferBatchOnChain,
  getBatchFromChain,
  getBatchHistoryFromChain,
  generateDataHash,
} = require("../services/blockchainService");
const { generateUnitsForBatch } = require("../services/unitService");

const router = express.Router();

/**
 * POST /api/batch/create
 * Create a new medicine batch — stores on-chain + off-chain.
 * Also generates unit records with hierarchical packaging and Merkle tree.
 * Manufacturer only.
 */
router.post("/create", auth, roleCheck("manufacturer"), async (req, res) => {
  try {
    const {
      batchId,
      medicineName,
      description,
      dosage,
      composition,
      sideEffects,
      expiryDate,
      quantity,
      unit,
      unitsPerBox,
      boxesPerCarton,
    } = req.body;

    if (!batchId || !medicineName || !expiryDate) {
      return res.status(400).json({ error: "batchId, medicineName, and expiryDate are required" });
    }

    // Check if batch already exists off-chain
    const existing = await BatchMetadata.findOne({ batchId });
    if (existing) {
      return res.status(400).json({ error: "Batch ID already exists" });
    }

    // Get user with private key for signing
    const user = await User.findById(req.userId).select("+privateKey");
    if (!user.privateKey) {
      return res.status(400).json({ error: "No private key found. Cannot sign blockchain transaction." });
    }

    // Generate metadata hash for on-chain storage
    const metadata = { medicineName, dosage, composition, manufacturerName: user.organizationName, expiryDate };
    const dataHash = generateDataHash(metadata);

    // Convert expiry to Unix timestamp
    const expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);

    // Generate unit records and Merkle tree
    const totalQuantity = Number(quantity) || 100; // default to 100 units for demo
    let unitGenResult = { merkleRoot: "0x" + "0".repeat(64), totalUnits: 0 };

    if (totalQuantity > 0) {
      unitGenResult = await generateUnitsForBatch(
        batchId,
        totalQuantity,
        Number(unitsPerBox) || 50,
        Number(boxesPerCarton) || 20
      );
    }

    // Create on-chain (with Merkle root)
    const txResult = await createBatchOnChain(
      batchId,
      dataHash,
      expiryTimestamp,
      user.privateKey,
      unitGenResult.merkleRoot,
      unitGenResult.totalUnits
    );

    // Generate batch-level QR code
    const qrCodeData = await generateQRCode(batchId);

    // Store metadata off-chain
    const batchMeta = new BatchMetadata({
      batchId,
      medicineName,
      description: description || "",
      dosage: dosage || "",
      composition: composition || "",
      sideEffects: sideEffects || "",
      manufacturerName: user.organizationName || user.username,
      manufacturerAddress: user.walletAddress,
      manufactureDate: new Date(),
      expiryDate: new Date(expiryDate),
      quantity: totalQuantity,
      unit: unit || "tablets",
      qrCodeData,
      dataHash,
      status: "created",
    });

    await batchMeta.save();

    res.status(201).json({
      message: "Batch created successfully with unit-level tracking",
      batch: batchMeta,
      blockchain: txResult,
      unitTracking: {
        totalUnits: unitGenResult.totalUnits,
        cartonCount: unitGenResult.cartonCount,
        boxCount: unitGenResult.boxCount,
        merkleRoot: unitGenResult.merkleRoot,
        unitsPerBox: Number(unitsPerBox) || 50,
        boxesPerCarton: Number(boxesPerCarton) || 20,
      },
    });
  } catch (error) {
    console.error("Batch creation error:", error);
    res.status(500).json({ error: "Batch creation failed: " + error.message });
  }
});

/**
 * POST /api/batch/transfer
 * Transfer batch ownership — updates on-chain + off-chain status.
 */
router.post("/transfer", auth, roleCheck("manufacturer", "distributor", "pharmacy"), async (req, res) => {
  try {
    const { batchId, newOwnerAddress } = req.body;

    if (!batchId || !newOwnerAddress) {
      return res.status(400).json({ error: "batchId and newOwnerAddress are required" });
    }

    // Get sender's private key
    const sender = await User.findById(req.userId).select("+privateKey");
    if (!sender.privateKey) {
      return res.status(400).json({ error: "No private key found for signing." });
    }

    // Transfer on-chain
    const txResult = await transferBatchOnChain(batchId, newOwnerAddress, sender.privateKey);

    // Update off-chain status
    const receiver = await User.findOne({ walletAddress: newOwnerAddress });
    let newStatus = "in-transit";
    if (receiver) {
      if (receiver.role === "pharmacy") newStatus = "delivered";
      if (receiver.role === "consumer") newStatus = "with-consumer";
    }

    await BatchMetadata.findOneAndUpdate(
      { batchId },
      { status: newStatus }
    );

    res.json({
      message: "Batch transferred successfully",
      batchId,
      newOwner: newOwnerAddress,
      newStatus,
      blockchain: txResult,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ error: "Transfer failed: " + error.message });
  }
});

/**
 * GET /api/batch/:batchId
 * Get batch details (combined on-chain + off-chain).
 */
router.get("/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    // Get off-chain metadata
    const metadata = await BatchMetadata.findOne({ batchId });

    // Get on-chain data
    let blockchainData = null;
    try {
      blockchainData = await getBatchFromChain(batchId);
    } catch (err) {
      console.warn("Could not fetch blockchain data:", err.message);
    }

    if (!metadata && !blockchainData) {
      return res.status(404).json({ error: "Batch not found" });
    }

    res.json({
      metadata: metadata || null,
      blockchain: blockchainData || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch batch: " + error.message });
  }
});

/**
 * GET /api/batch/:batchId/history
 * Get full supply chain history of a batch.
 */
router.get("/:batchId/history", async (req, res) => {
  try {
    const { batchId } = req.params;

    let history = [];
    try {
      history = await getBatchHistoryFromChain(batchId);
    } catch (err) {
      console.warn("Could not fetch blockchain history:", err.message);
    }

    const metadata = await BatchMetadata.findOne({ batchId });

    res.json({
      batchId,
      history,
      metadata: metadata || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history: " + error.message });
  }
});

/**
 * GET /api/batch/:batchId/qr
 * Get the QR code for a batch.
 */
router.get("/:batchId/qr", async (req, res) => {
  try {
    const { batchId } = req.params;
    const metadata = await BatchMetadata.findOne({ batchId });

    if (!metadata) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Regenerate if missing
    if (!metadata.qrCodeData) {
      const qrCodeData = await generateQRCode(batchId);
      metadata.qrCodeData = qrCodeData;
      await metadata.save();
    }

    res.json({ batchId, qrCode: metadata.qrCodeData });
  } catch (error) {
    res.status(500).json({ error: "Failed to get QR code" });
  }
});

/**
 * GET /api/batch
 * List all batches (with optional filters).
 */
router.get("/", auth, async (req, res) => {
  try {
    const { status, manufacturer } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (manufacturer) filter.manufacturerAddress = manufacturer;

    // Role-based filtering
    if (req.user.role === "manufacturer") {
      filter.manufacturerAddress = req.user.walletAddress;
    }

    const batches = await BatchMetadata.find(filter).sort({ createdAt: -1 });
    res.json({ batches });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

module.exports = router;
