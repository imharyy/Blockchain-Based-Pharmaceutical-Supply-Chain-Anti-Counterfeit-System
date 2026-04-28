const express = require("express");
const ScanLog = require("../models/ScanLog");
const { verifyBatchOnChain, getBatchHistoryFromChain } = require("../services/blockchainService");
const { analyzeScan, getBatchAnomalyStats } = require("../services/anomalyService");
const BatchMetadata = require("../models/BatchMetadata");

const router = express.Router();

/**
 * POST /api/verify/scan
 * Log a QR scan event, run anomaly detection, and return verification result.
 * This is the main consumer-facing endpoint for BATCH-level verification.
 *
 * For unit-level verification, use GET /api/unit/verify/:serialNumber instead.
 * This endpoint includes smart routing: if the batchId looks like a unit serial
 * number (contains "-U-"), it redirects the client to the unit verification endpoint.
 */
router.post("/scan", async (req, res) => {
  try {
    const { batchId, location, scannedBy, scannerRole } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: "batchId is required" });
    }

    // Smart routing: detect unit serial numbers
    if (batchId.includes("-U-")) {
      return res.json({
        redirect: true,
        redirectTo: `/api/unit/verify/${encodeURIComponent(batchId)}`,
        message: "This is a unit serial number. Use the unit verification endpoint.",
        serialNumber: batchId,
      });
    }

    // Smart routing: detect packaging level IDs
    if (batchId.includes("-B-") || batchId.includes("-C-")) {
      return res.json({
        redirect: true,
        redirectTo: `/api/unit/packaging/${encodeURIComponent(batchId)}/qr`,
        message: "This is a packaging level ID. Use the packaging scan endpoint.",
        levelId: batchId,
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    // 1. Run anomaly detection BEFORE logging (so this scan isn't counted yet)
    const anomaly = await analyzeScan(batchId, location, ipAddress);

    // 2. Verify on blockchain
    let blockchainVerification = null;
    let isBlockchainValid = false;
    try {
      blockchainVerification = await verifyBatchOnChain(batchId);
      isBlockchainValid = blockchainVerification.isValid;
    } catch (err) {
      console.warn("Blockchain verification failed:", err.message);
    }

    // 3. Get batch history
    let history = [];
    try {
      history = await getBatchHistoryFromChain(batchId);
    } catch (err) {
      console.warn("Could not fetch history:", err.message);
    }

    // 4. Get off-chain metadata
    const metadata = await BatchMetadata.findOne({ batchId });

    // 5. Determine verification result
    let verificationResult = "valid";
    if (!isBlockchainValid && !metadata) {
      verificationResult = "invalid";
    } else if (blockchainVerification && blockchainVerification.isExpired) {
      verificationResult = "expired";
    } else if (anomaly.isSuspicious) {
      verificationResult = "suspicious";
    }

    // 6. Log the scan
    const scanLog = new ScanLog({
      batchId,
      scannedBy: scannedBy || "anonymous",
      scannerRole: scannerRole || "unknown",
      location: location || "unknown",
      ipAddress,
      userAgent,
      flagged: anomaly.isSuspicious,
      flagReason: anomaly.reasons.join("; "),
      verificationResult,
    });
    await scanLog.save();

    // 7. Build response
    res.json({
      batchId,
      verificationResult,
      isAuthentic: verificationResult === "valid",
      isSuspicious: anomaly.isSuspicious,
      anomalyReasons: anomaly.reasons,
      blockchain: blockchainVerification,
      history,
      metadata: metadata
        ? {
            medicineName: metadata.medicineName,
            description: metadata.description,
            dosage: metadata.dosage,
            composition: metadata.composition,
            sideEffects: metadata.sideEffects,
            manufacturerName: metadata.manufacturerName,
            expiryDate: metadata.expiryDate,
            quantity: metadata.quantity,
            unit: metadata.unit,
          }
        : null,
      scanInfo: {
        scanId: scanLog._id,
        timestamp: scanLog.createdAt,
        scanCount: anomaly.scanCount + 1,
      },
    });
  } catch (error) {
    console.error("Scan/verify error:", error);
    res.status(500).json({ error: "Verification failed: " + error.message });
  }
});

/**
 * GET /api/verify/:batchId
 * Quick verification without logging a scan (for API consumers).
 */
router.get("/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    let blockchainData = null;
    try {
      blockchainData = await verifyBatchOnChain(batchId);
    } catch (err) {
      console.warn("Blockchain verify failed:", err.message);
    }

    const metadata = await BatchMetadata.findOne({ batchId });
    const anomalyStats = await getBatchAnomalyStats(batchId);

    if (!blockchainData?.isValid && !metadata) {
      return res.json({
        batchId,
        isAuthentic: false,
        verificationResult: "invalid",
        message: "⚠️ This product could not be verified. It may be counterfeit.",
      });
    }

    res.json({
      batchId,
      isAuthentic: blockchainData?.isValid && !blockchainData?.isExpired,
      verificationResult: blockchainData?.isExpired ? "expired" : "valid",
      blockchain: blockchainData,
      metadata: metadata || null,
      anomalyStats,
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * GET /api/verify/:batchId/scans
 * Get scan logs for a batch (admin/manufacturer).
 */
router.get("/:batchId/scans", async (req, res) => {
  try {
    const { batchId } = req.params;
    const scans = await ScanLog.find({ batchId }).sort({ createdAt: -1 }).limit(100);
    const stats = await getBatchAnomalyStats(batchId);

    res.json({ batchId, scans, stats });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scan logs" });
  }
});

module.exports = router;
