const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { registerStakeholderOnChain } = require("../services/blockchainService");

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user (off-chain) and optionally register on blockchain.
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role, walletAddress, privateKey, organizationName } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role || !walletAddress) {
      return res.status(400).json({ error: "All fields are required: username, email, password, role, walletAddress" });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { walletAddress }],
    });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email, username, or wallet already exists" });
    }

    // Create user in MongoDB
    const user = new User({
      username,
      email,
      password,
      role,
      walletAddress,
      privateKey, // For demo only
      organizationName: organizationName || username,
      isBlockchainRegistered: false,
    });

    await user.save();

    // Try to register on blockchain (admin signs the tx)
    try {
      await registerStakeholderOnChain(
        walletAddress,
        role,
        organizationName || username
      );
      user.isBlockchainRegistered = true;
      await user.save();
    } catch (bcError) {
      console.warn(`  ⚠️  Blockchain registration failed for ${username}: ${bcError.message}`);
      // User is still created off-chain; can be registered on-chain later
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        isBlockchainRegistered: user.isBlockchainRegistered,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed: " + error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+privateKey");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        privateKey: user.privateKey, // For demo — remove in production
        isBlockchainRegistered: user.isBlockchainRegistered,
        organizationName: user.organizationName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile.
 */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        isBlockchainRegistered: user.isBlockchainRegistered,
        organizationName: user.organizationName,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * GET /api/auth/users
 * Get all users (admin only).
 */
router.get("/users", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const users = await User.find({}).select("-password -privateKey");
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
