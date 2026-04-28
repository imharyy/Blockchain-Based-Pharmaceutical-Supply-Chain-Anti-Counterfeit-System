const express = require("express");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const UnitRecord = require("../models/UnitRecord");
const PackagingLevel = require("../models/PackagingLevel");
const BatchMetadata = require("../models/BatchMetadata");
const {
  verifyUnit,
  scanPackagingLevel,
  getUnitStats,
  getPackagingHierarchy,
} = require("../services/unitService");
const {
  verifyBatchOnChain,
  getBatchMerkleRootFromChain,
  getBatchHistoryFromChain,
} = require("../services/blockchainService");
const { analyzeScan } = require("../services/anomalyService");
const { generateUnitQR, generatePackagingQR } = require("../services/qrService");
const ScanLog = require("../models/ScanLog");

const router = express.Router();

/**
 * GET /api/unit/verify/:serialNumber
 * Consumer endpoint — Verify a single unit (packet).
 * No authentication required (public).
 */
router.get("/verify/:serialNumber", async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const location = req.query.location || "web-app";
    const ipAddress = req.ip || req.connection.remoteAddress || "";

    // 1. Get on-chain Merkle root for the batch
    const unit = await UnitRecord.findOne({ serialNumber });
    let onChainMerkleRoot = null;
    let blockchainVerification = null;
    let batchMetadata = null;
    let history = [];

    if (unit) {
      // Get blockchain data for the parent batch
      try {
        const merkleData = await getBatchMerkleRootFromChain(unit.batchId);
        onChainMerkleRoot = merkleData.merkleRoot;
      } catch (err) {
        console.warn("Could not fetch Merkle root from chain:", err.message);
      }

      try {
        blockchainVerification = await verifyBatchOnChain(unit.batchId);
      } catch (err) {
        console.warn("Blockchain verification failed:", err.message);
      }

      try {
        history = await getBatchHistoryFromChain(unit.batchId);
      } catch (err) {
        console.warn("Could not fetch history:", err.message);
      }

      batchMetadata = await BatchMetadata.findOne({ batchId: unit.batchId });
    }

    // 2. Run unit verification
    const verification = await verifyUnit(serialNumber, {
      location,
      ipAddress,
      onChainMerkleRoot,
    });

    // 3. Run batch-level anomaly detection too
    let anomaly = { isSuspicious: false, reasons: [], scanCount: 0 };
    if (unit) {
      anomaly = await analyzeScan(unit.batchId, location, ipAddress);
    }

    // Merge anomaly reasons
    if (anomaly.isSuspicious) {
      verification.isSuspicious = true;
      verification.suspicionReasons = [
        ...verification.suspicionReasons,
        ...anomaly.reasons,
      ];
    }

    // 4. Log the scan
    const scanLog = new ScanLog({
      batchId: unit ? unit.batchId : serialNumber,
      scannedBy: "consumer",
      scannerRole: "consumer",
      location,
      ipAddress,
      userAgent: req.headers["user-agent"] || "",
      flagged: verification.isSuspicious,
      flagReason: verification.suspicionReasons.join("; "),
      verificationResult: verification.status === "valid" ? "valid" :
                          verification.status === "already-dispensed" ? "suspicious" :
                          verification.status === "suspicious" ? "suspicious" : "invalid",
    });
    await scanLog.save();

    // 5. Return combined response
    res.json({
      ...verification,
      blockchain: blockchainVerification,
      history,
      metadata: batchMetadata
        ? {
            medicineName: batchMetadata.medicineName,
            description: batchMetadata.description,
            dosage: batchMetadata.dosage,
            composition: batchMetadata.composition,
            sideEffects: batchMetadata.sideEffects,
            manufacturerName: batchMetadata.manufacturerName,
            expiryDate: batchMetadata.expiryDate,
            quantity: batchMetadata.quantity,
            unit: batchMetadata.unit,
          }
        : null,
      scanInfo: {
        scanId: scanLog._id,
        timestamp: scanLog.createdAt,
        unitScanCount: verification.unitInfo?.scanCount || 1,
        batchScanCount: anomaly.scanCount + 1,
      },
    });
  } catch (error) {
    console.error("Unit verification error:", error);
    res.status(500).json({ error: "Unit verification failed: " + error.message });
  }
});

/**
 * POST /api/unit/scan-packaging
 * Scan a box or carton QR — cascades status to all children.
 * Requires auth: Manufacturer, Distributor, or Pharmacy.
 */
router.post(
  "/scan-packaging",
  auth,
  roleCheck("manufacturer", "distributor", "pharmacy"),
  async (req, res) => {
    try {
      const { levelId, newStatus } = req.body;

      if (!levelId) {
        return res.status(400).json({ error: "levelId is required" });
      }

      // Determine status based on scanner's role if not provided
      let status = newStatus;
      if (!status) {
        switch (req.user.role) {
          case "distributor":
            status = "in-transit";
            break;
          case "pharmacy":
            status = "at-pharmacy";
            break;
          default:
            status = "in-transit";
        }
      }

      const result = await scanPackagingLevel(
        levelId,
        req.user.walletAddress || req.user.username,
        status
      );

      res.json({
        message: `Packaging level scanned successfully. ${result.childrenUpdated} children updated.`,
        ...result,
      });
    } catch (error) {
      console.error("Packaging scan error:", error);
      res.status(500).json({ error: "Packaging scan failed: " + error.message });
    }
  }
);

/**
 * GET /api/unit/batch/:batchId
 * List units for a batch (paginated).
 */
router.get("/batch/:batchId", auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;
    const boxId = req.query.boxId;

    const filter = { batchId };
    if (status) filter.status = status;
    if (boxId) filter.parentBoxId = boxId;

    const total = await UnitRecord.countDocuments(filter);
    const units = await UnitRecord.find(filter)
      .sort({ unitIndex: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-merkleProof -qrCodeData"); // Exclude large fields for listing

    res.json({
      batchId,
      units,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch units: " + error.message });
  }
});

/**
 * GET /api/unit/batch/:batchId/stats
 * Get unit statistics for a batch.
 */
router.get("/batch/:batchId/stats", auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const stats = await getUnitStats(batchId);
    res.json({ batchId, stats });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unit stats: " + error.message });
  }
});

/**
 * GET /api/unit/batch/:batchId/packaging
 * Get packaging hierarchy (cartons and boxes) for a batch.
 */
router.get("/batch/:batchId/packaging", auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const hierarchy = await getPackagingHierarchy(batchId);
    res.json({ batchId, ...hierarchy });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch packaging: " + error.message });
  }
});

/**
 * GET /api/unit/box/:boxId
 * List units in a specific box.
 */
router.get("/box/:boxId", auth, async (req, res) => {
  try {
    const { boxId } = req.params;
    const units = await UnitRecord.find({ parentBoxId: boxId })
      .sort({ unitIndex: 1 })
      .select("-merkleProof");

    const box = await PackagingLevel.findOne({ levelId: boxId });

    res.json({
      box: box || null,
      units,
      count: units.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch box units: " + error.message });
  }
});

/**
 * GET /api/unit/:serialNumber/qr
 * Get or generate QR code for a specific unit.
 */
router.get("/:serialNumber/qr", async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const unit = await UnitRecord.findOne({ serialNumber });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    // Generate QR on-demand if not cached
    if (!unit.qrCodeData) {
      unit.qrCodeData = await generateUnitQR(serialNumber);
      await unit.save();
    }

    res.json({ serialNumber, qrCode: unit.qrCodeData });
  } catch (error) {
    res.status(500).json({ error: "Failed to get unit QR: " + error.message });
  }
});

/**
 * GET /api/unit/packaging/:levelId/qr
 * Get or generate QR code for a packaging level (box/carton).
 */
router.get("/packaging/:levelId/qr", async (req, res) => {
  try {
    const { levelId } = req.params;
    const level = await PackagingLevel.findOne({ levelId });

    if (!level) {
      return res.status(404).json({ error: "Packaging level not found" });
    }

    if (!level.qrCodeData) {
      level.qrCodeData = await generatePackagingQR(levelId);
      await level.save();
    }

    res.json({ levelId, type: level.type, qrCode: level.qrCodeData });
  } catch (error) {
    res.status(500).json({ error: "Failed to get packaging QR: " + error.message });
  }
});

module.exports = router;
