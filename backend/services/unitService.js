const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const UnitRecord = require("../models/UnitRecord");
const PackagingLevel = require("../models/PackagingLevel");
const { generateUnitQR, generatePackagingQR } = require("./qrService");

/**
 * Unit Service — Core logic for unit-level tracking.
 *
 * Handles:
 * - Generating unit records & packaging hierarchy for a batch
 * - Building Merkle trees for on-chain verification
 * - Verifying individual units (consumer endpoint)
 * - Cascade status updates when packaging levels are scanned
 */

/**
 * Generate all unit records, packaging levels, and Merkle tree for a batch.
 *
 * @param {string} batchId       - Batch identifier
 * @param {number} totalQuantity - Total number of individual units
 * @param {number} unitsPerBox   - Number of units per box (default: 50)
 * @param {number} boxesPerCarton - Number of boxes per carton (default: 20)
 * @returns {Object} { merkleRoot, totalUnits, cartonCount, boxCount, tree }
 */
async function generateUnitsForBatch(batchId, totalQuantity, unitsPerBox = 50, boxesPerCarton = 20) {
  const totalUnits = totalQuantity;
  const totalBoxes = Math.ceil(totalUnits / unitsPerBox);
  const totalCartons = Math.ceil(totalBoxes / boxesPerCarton);

  console.log(`  📦 Generating ${totalUnits} units across ${totalBoxes} boxes in ${totalCartons} cartons...`);

  // 1. Generate all serial numbers
  const serialNumbers = [];
  for (let i = 0; i < totalUnits; i++) {
    const serial = formatSerialNumber(batchId, "U", i + 1, totalUnits);
    serialNumbers.push(serial);
  }

  // 2. Build Merkle tree
  const { root, proofs } = buildMerkleTree(serialNumbers);

  // 3. Create carton records
  const cartonDocs = [];
  for (let c = 0; c < totalCartons; c++) {
    const cartonId = formatSerialNumber(batchId, "C", c + 1, totalCartons);
    const boxesInThisCarton = Math.min(boxesPerCarton, totalBoxes - c * boxesPerCarton);
    cartonDocs.push({
      levelId: cartonId,
      batchId,
      type: "carton",
      parentId: "",
      childCount: boxesInThisCarton,
      status: "created",
    });
  }

  // 4. Create box records
  const boxDocs = [];
  for (let b = 0; b < totalBoxes; b++) {
    const boxId = formatSerialNumber(batchId, "B", b + 1, totalBoxes);
    const cartonIndex = Math.floor(b / boxesPerCarton);
    const cartonId = formatSerialNumber(batchId, "C", cartonIndex + 1, totalCartons);
    const unitsInThisBox = Math.min(unitsPerBox, totalUnits - b * unitsPerBox);
    boxDocs.push({
      levelId: boxId,
      batchId,
      type: "box",
      parentId: cartonId,
      childCount: unitsInThisBox,
      status: "created",
    });
  }

  // 5. Create unit records
  const unitDocs = [];
  for (let i = 0; i < totalUnits; i++) {
    const boxIndex = Math.floor(i / unitsPerBox);
    const cartonIndex = Math.floor(boxIndex / boxesPerCarton);
    const boxId = formatSerialNumber(batchId, "B", boxIndex + 1, totalBoxes);
    const cartonId = formatSerialNumber(batchId, "C", cartonIndex + 1, totalCartons);

    unitDocs.push({
      serialNumber: serialNumbers[i],
      batchId,
      unitIndex: i,
      parentBoxId: boxId,
      parentCartonId: cartonId,
      status: "created",
      merkleProof: proofs[i],
    });
  }

  // 6. Bulk insert into MongoDB (use ordered:false for performance)
  if (cartonDocs.length > 0) {
    await PackagingLevel.insertMany(cartonDocs, { ordered: false });
  }
  if (boxDocs.length > 0) {
    await PackagingLevel.insertMany(boxDocs, { ordered: false });
  }
  // Insert units in batches of 1000 to avoid memory issues
  for (let i = 0; i < unitDocs.length; i += 1000) {
    const chunk = unitDocs.slice(i, i + 1000);
    await UnitRecord.insertMany(chunk, { ordered: false });
  }

  console.log(`  ✅ Generated: ${totalCartons} cartons, ${totalBoxes} boxes, ${totalUnits} units`);
  console.log(`  🌳 Merkle root: ${root}`);

  return {
    merkleRoot: root,
    totalUnits,
    cartonCount: totalCartons,
    boxCount: totalBoxes,
    unitCount: totalUnits,
  };
}

/**
 * Build a Merkle tree from an array of serial numbers.
 *
 * @param {string[]} serialNumbers - Array of unit serial numbers
 * @returns {Object} { root: hex string, proofs: hex string[][], tree: MerkleTree }
 */
function buildMerkleTree(serialNumbers) {
  const leaves = serialNumbers.map((sn) => keccak256(sn));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  const proofs = serialNumbers.map((sn) => {
    const leaf = keccak256(sn);
    return tree.getHexProof(leaf);
  });

  return { root, proofs, tree };
}

/**
 * Verify a unit's Merkle proof against the on-chain Merkle root.
 *
 * @param {string} serialNumber - The unit serial number
 * @param {string} merkleRoot   - The on-chain Merkle root (hex string)
 * @param {string[]} proof      - The Merkle proof (array of hex strings)
 * @returns {boolean} Whether the proof is valid
 */
function verifyUnitMerkleProof(serialNumber, merkleRoot, proof) {
  const leaf = keccak256(serialNumber);
  const tree = new MerkleTree([], keccak256, { sortPairs: true }); // empty tree for static verify
  return tree.verify(proof, leaf, merkleRoot);
}

/**
 * Full consumer-facing unit verification.
 *
 * Checks:
 * 1. Does this unit exist in the database?
 * 2. Has it already been dispensed (sold)?
 * 3. Is the Merkle proof valid against the on-chain root?
 * 4. Is there a location mismatch or anomaly?
 * 5. Too many scans?
 *
 * @param {string} serialNumber - The unit serial number to verify
 * @param {Object} options      - { location, ipAddress, onChainMerkleRoot }
 * @returns {Object} Verification result
 */
async function verifyUnit(serialNumber, options = {}) {
  const { location = "unknown", ipAddress = "", onChainMerkleRoot = null } = options;

  const result = {
    serialNumber,
    exists: false,
    isAuthentic: false,
    isAlreadyDispensed: false,
    merkleProofValid: false,
    isSuspicious: false,
    suspicionReasons: [],
    unitInfo: null,
    batchId: null,
    status: "invalid",
  };

  // 1. Find unit in database
  const unit = await UnitRecord.findOne({ serialNumber });
  if (!unit) {
    result.status = "invalid";
    result.suspicionReasons.push("Unit serial number not found in database");
    return result;
  }

  result.exists = true;
  result.batchId = unit.batchId;
  result.unitInfo = {
    serialNumber: unit.serialNumber,
    batchId: unit.batchId,
    parentBoxId: unit.parentBoxId,
    parentCartonId: unit.parentCartonId,
    status: unit.status,
    scanCount: unit.scanCount,
    dispensedAt: unit.dispensedAt,
  };

  // 2. Check if already dispensed (with grace period for React StrictMode / rapid double-taps)
  const GRACE_PERIOD_MS = 30_000; // 30 seconds
  let wasAlreadyDispensed = false;

  if (unit.status === "dispensed") {
    const timeSinceDispensed = unit.dispensedAt
      ? Date.now() - new Date(unit.dispensedAt).getTime()
      : Infinity;

    if (timeSinceDispensed > GRACE_PERIOD_MS) {
      // Genuinely a re-scan of an already-sold unit
      wasAlreadyDispensed = true;
      result.isAlreadyDispensed = true;
      result.status = "already-dispensed";
      result.suspicionReasons.push(
        `This unit was already dispensed on ${unit.dispensedAt ? unit.dispensedAt.toISOString() : "unknown date"}`
      );
    }
    // else: within grace period — treat as the original valid scan
  }

  // 3. Verify Merkle proof (if on-chain root is provided)
  if (onChainMerkleRoot && unit.merkleProof && unit.merkleProof.length > 0) {
    const proofValid = verifyUnitMerkleProof(serialNumber, onChainMerkleRoot, unit.merkleProof);
    result.merkleProofValid = proofValid;
    if (!proofValid) {
      result.suspicionReasons.push("Merkle proof verification FAILED — unit may not belong to this batch");
    }
  } else if (onChainMerkleRoot) {
    result.suspicionReasons.push("No Merkle proof available for this unit");
  } else {
    // If no on-chain root provided, mark as not verified on-chain
    result.merkleProofValid = null; // unknown
  }

  // 4. Check scan count anomalies (ignore grace-period re-scans)
  if (unit.scanCount >= 5) {
    result.isSuspicious = true;
    result.suspicionReasons.push(
      `This unit has been scanned ${unit.scanCount} times — possible duplicate or counterfeit`
    );
  }

  // 5. Update unit scan info
  unit.scanCount += 1;
  unit.lastScannedAt = new Date();
  unit.lastScannedLocation = location;

  // If not already dispensed, mark as dispensed on first consumer scan
  if (unit.status !== "dispensed" && unit.status !== "recalled") {
    unit.status = "dispensed";
    unit.dispensedAt = new Date();
    unit.dispensedTo = "consumer";
  }

  await unit.save();

  // Update unitInfo to reflect the post-save state
  result.unitInfo.status = unit.status;
  result.unitInfo.scanCount = unit.scanCount;
  result.unitInfo.dispensedAt = unit.dispensedAt;

  // 6. Determine final status
  if (!wasAlreadyDispensed) {
    if (result.isSuspicious) {
      result.status = "suspicious";
    } else {
      result.status = "valid";
      result.isAuthentic = true;
    }
  }

  return result;
}

/**
 * Scan a packaging level (box or carton) and cascade status to all children.
 * Used by distributors and pharmacies to update entire groups of units at once.
 *
 * @param {string} levelId   - The box/carton ID
 * @param {string} scannedBy - Who scanned (wallet address or name)
 * @param {string} newStatus - New status to apply ("in-transit", "at-pharmacy", etc.)
 * @returns {Object} { updated, childrenUpdated, level }
 */
async function scanPackagingLevel(levelId, scannedBy, newStatus) {
  const level = await PackagingLevel.findOne({ levelId });
  if (!level) {
    throw new Error(`Packaging level not found: ${levelId}`);
  }

  // Update the packaging level itself
  level.status = newStatus;
  level.scannedAt = new Date();
  level.scannedBy = scannedBy;
  await level.save();

  let childrenUpdated = 0;

  if (level.type === "carton") {
    // Update all boxes in this carton
    const boxResult = await PackagingLevel.updateMany(
      { parentId: levelId, type: "box" },
      { $set: { status: newStatus, scannedAt: new Date(), scannedBy } }
    );
    childrenUpdated += boxResult.modifiedCount;

    // Update all units in all boxes of this carton
    const boxes = await PackagingLevel.find({ parentId: levelId, type: "box" });
    const boxIds = boxes.map((b) => b.levelId);

    if (boxIds.length > 0) {
      const unitResult = await UnitRecord.updateMany(
        { parentBoxId: { $in: boxIds }, status: { $ne: "dispensed" } },
        { $set: { status: newStatus } }
      );
      childrenUpdated += unitResult.modifiedCount;
    }
  } else if (level.type === "box") {
    // Update all units in this box
    const unitResult = await UnitRecord.updateMany(
      { parentBoxId: levelId, status: { $ne: "dispensed" } },
      { $set: { status: newStatus } }
    );
    childrenUpdated += unitResult.modifiedCount;
  }

  return {
    level: {
      levelId: level.levelId,
      type: level.type,
      batchId: level.batchId,
      status: newStatus,
    },
    childrenUpdated,
  };
}

/**
 * Get unit statistics for a batch.
 */
async function getUnitStats(batchId) {
  const total = await UnitRecord.countDocuments({ batchId });
  const created = await UnitRecord.countDocuments({ batchId, status: "created" });
  const inTransit = await UnitRecord.countDocuments({ batchId, status: "in-transit" });
  const atPharmacy = await UnitRecord.countDocuments({ batchId, status: "at-pharmacy" });
  const dispensed = await UnitRecord.countDocuments({ batchId, status: "dispensed" });
  const recalled = await UnitRecord.countDocuments({ batchId, status: "recalled" });

  const cartonCount = await PackagingLevel.countDocuments({ batchId, type: "carton" });
  const boxCount = await PackagingLevel.countDocuments({ batchId, type: "box" });

  return {
    total,
    created,
    inTransit,
    atPharmacy,
    dispensed,
    recalled,
    cartonCount,
    boxCount,
  };
}

/**
 * Get packaging hierarchy for a batch.
 */
async function getPackagingHierarchy(batchId) {
  const cartons = await PackagingLevel.find({ batchId, type: "carton" }).sort({ levelId: 1 });
  const boxes = await PackagingLevel.find({ batchId, type: "box" }).sort({ levelId: 1 });

  return { cartons, boxes };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a serial number with zero-padded index.
 * e.g., formatSerialNumber("BATCH001", "U", 1, 10000) → "BATCH001-U-00001"
 */
function formatSerialNumber(batchId, prefix, index, total) {
  const padLength = Math.max(String(total).length, 3);
  const paddedIndex = String(index).padStart(padLength, "0");
  return `${batchId}-${prefix}-${paddedIndex}`;
}

module.exports = {
  generateUnitsForBatch,
  buildMerkleTree,
  verifyUnitMerkleProof,
  verifyUnit,
  scanPackagingLevel,
  getUnitStats,
  getPackagingHierarchy,
  formatSerialNumber,
};
