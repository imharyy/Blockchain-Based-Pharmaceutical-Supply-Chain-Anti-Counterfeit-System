const express = require("express");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const User = require("../models/User");
const BatchMetadata = require("../models/BatchMetadata");
const ScanLog = require("../models/ScanLog");
const { registerStakeholderOnChain, getAllStakeholdersFromChain, getStakeholderFromChain } = require("../services/blockchainService");

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Admin dashboard stats.
 */
router.get("/dashboard", auth, roleCheck("admin"), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBatches = await BatchMetadata.countDocuments();
    const totalScans = await ScanLog.countDocuments();
    const flaggedScans = await ScanLog.countDocuments({ flagged: true });

    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const batchesByStatus = await BatchMetadata.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const recentScans = await ScanLog.find({})
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: { totalUsers, totalBatches, totalScans, flaggedScans },
      usersByRole,
      batchesByStatus,
      recentScans,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

/**
 * POST /api/admin/register-stakeholder
 * Register a stakeholder on blockchain (if not already registered).
 */
router.post("/register-stakeholder", auth, roleCheck("admin"), async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isBlockchainRegistered) {
      return res.status(400).json({ error: "User already registered on blockchain" });
    }

    const txResult = await registerStakeholderOnChain(
      user.walletAddress,
      user.role,
      user.organizationName || user.username
    );

    user.isBlockchainRegistered = true;
    await user.save();

    res.json({
      message: "Stakeholder registered on blockchain",
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        walletAddress: user.walletAddress,
      },
      blockchain: txResult,
    });
  } catch (error) {
    console.error("Blockchain registration error:", error);
    res.status(500).json({ error: "Blockchain registration failed: " + error.message });
  }
});

/**
 * GET /api/admin/stakeholders
 * Get all stakeholders (from MongoDB + blockchain status).
 */
router.get("/stakeholders", auth, roleCheck("admin"), async (req, res) => {
  try {
    const users = await User.find({}).select("-password -privateKey");
    res.json({ stakeholders: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stakeholders" });
  }
});

module.exports = router;
