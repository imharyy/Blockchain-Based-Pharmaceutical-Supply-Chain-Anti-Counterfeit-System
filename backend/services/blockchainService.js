const { getContract, getContractWithSigner, getProvider } = require("../config/blockchain");
const { ethers } = require("ethers");

/**
 * Blockchain Service — Wrapper for smart contract interactions.
 * Keeps route handlers clean by abstracting contract calls.
 */

// Role mapping: string → enum value
const ROLE_MAP = {
  admin: 1,
  manufacturer: 2,
  distributor: 3,
  pharmacy: 4,
  consumer: 5,
};

const ROLE_NAMES = {
  0: "None",
  1: "Admin",
  2: "Manufacturer",
  3: "Distributor",
  4: "Pharmacy",
  5: "Consumer",
};

/**
 * Register a stakeholder on-chain.
 */
async function registerStakeholderOnChain(address, role, name) {
  const contract = getContract();
  const roleEnum = ROLE_MAP[role];
  if (!roleEnum) throw new Error(`Invalid role: ${role}`);

  const tx = await contract.registerStakeholder(address, roleEnum, name);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Create a batch on-chain (with Merkle root for unit-level tracking).
 *
 * @param {string} batchId          - Batch identifier
 * @param {string} dataHash         - keccak256 hash of off-chain metadata
 * @param {number} expiryTimestamp   - Unix timestamp for batch expiry
 * @param {string} signerPrivateKey  - Private key of the manufacturer
 * @param {string} unitsMerkleRoot   - Merkle root of all unit serial numbers (hex string)
 * @param {number} totalUnits        - Total number of individual units
 */
async function createBatchOnChain(batchId, dataHash, expiryTimestamp, signerPrivateKey, unitsMerkleRoot = ethers.ZeroHash, totalUnits = 0) {
  const contract = getContractWithSigner(signerPrivateKey);
  const tx = await contract.createBatch(batchId, dataHash, expiryTimestamp, unitsMerkleRoot, totalUnits);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Transfer a batch on-chain.
 */
async function transferBatchOnChain(batchId, newOwnerAddress, signerPrivateKey) {
  const contract = getContractWithSigner(signerPrivateKey);
  const tx = await contract.transferBatch(batchId, newOwnerAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Get batch info from blockchain.
 */
async function getBatchFromChain(batchId) {
  const contract = getContract();
  const batch = await contract.getBatch(batchId);

  return {
    batchId: batch.batchId,
    manufacturer: batch.manufacturer,
    currentOwner: batch.currentOwner,
    createdAt: Number(batch.createdAt),
    expiryDate: Number(batch.expiryDate),
    dataHash: batch.dataHash,
    unitsMerkleRoot: batch.unitsMerkleRoot,
    totalUnits: Number(batch.totalUnits),
    isActive: batch.isActive,
    transferCount: Number(batch.transferCount),
  };
}

/**
 * Get batch transfer history from blockchain.
 */
async function getBatchHistoryFromChain(batchId) {
  const contract = getContract();
  const history = await contract.getBatchHistory(batchId);

  return history.map((record) => ({
    from: record.from,
    to: record.to,
    timestamp: Number(record.timestamp),
    fromRole: ROLE_NAMES[Number(record.fromRole)] || "Unknown",
    toRole: ROLE_NAMES[Number(record.toRole)] || "Unknown",
  }));
}

/**
 * Verify a batch on-chain.
 */
async function verifyBatchOnChain(batchId) {
  const contract = getContract();
  const result = await contract.verifyBatch(batchId);

  return {
    isValid: result.isValid,
    manufacturer: result.manufacturer,
    currentOwner: result.currentOwner,
    expiryDate: Number(result.expiryDate),
    transferCount: Number(result.transferCount),
    isExpired: result.isExpired,
  };
}

/**
 * Get the Merkle root and total unit count for a batch from the blockchain.
 */
async function getBatchMerkleRootFromChain(batchId) {
  const contract = getContract();
  const result = await contract.getBatchMerkleRoot(batchId);

  return {
    merkleRoot: result.merkleRoot,
    totalUnits: Number(result.totalUnits),
  };
}

/**
 * Get stakeholder info from blockchain.
 */
async function getStakeholderFromChain(address) {
  const contract = getContract();
  const stake = await contract.getStakeholder(address);

  return {
    address: stake.addr,
    role: ROLE_NAMES[Number(stake.role)] || "Unknown",
    isRegistered: stake.isRegistered,
    name: stake.name,
  };
}

/**
 * Get all stakeholder addresses from blockchain.
 */
async function getAllStakeholdersFromChain() {
  const contract = getContract();
  return await contract.getAllStakeholders();
}

/**
 * Generate a keccak256 hash of batch metadata for on-chain storage.
 */
function generateDataHash(metadata) {
  const data = JSON.stringify({
    medicineName: metadata.medicineName,
    dosage: metadata.dosage,
    composition: metadata.composition,
    manufacturerName: metadata.manufacturerName,
    expiryDate: metadata.expiryDate,
  });
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

module.exports = {
  registerStakeholderOnChain,
  createBatchOnChain,
  transferBatchOnChain,
  getBatchFromChain,
  getBatchHistoryFromChain,
  verifyBatchOnChain,
  getBatchMerkleRootFromChain,
  getStakeholderFromChain,
  getAllStakeholdersFromChain,
  generateDataHash,
  ROLE_MAP,
  ROLE_NAMES,
};
