// test/PharmSupplyChain.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PharmSupplyChain", function () {
  let contract;
  let admin, manufacturer, distributor, pharmacy, consumer, unauthorized;

  // Role enum values
  const Role = { None: 0, Admin: 1, Manufacturer: 2, Distributor: 3, Pharmacy: 4, Consumer: 5 };

  // Helper: create batch with the new 5-parameter signature
  const ZERO_MERKLE_ROOT = ethers.ZeroHash; // 0x0000...0000 (32 bytes)

  beforeEach(async function () {
    [admin, manufacturer, distributor, pharmacy, consumer, unauthorized] = await ethers.getSigners();

    const PharmSupplyChain = await ethers.getContractFactory("PharmSupplyChain");
    contract = await PharmSupplyChain.deploy();
    await contract.waitForDeployment();

    // Register stakeholders
    await contract.registerStakeholder(manufacturer.address, Role.Manufacturer, "PharmaCorp");
    await contract.registerStakeholder(distributor.address, Role.Distributor, "MedDistribute");
    await contract.registerStakeholder(pharmacy.address, Role.Pharmacy, "HealthPlus");
    await contract.registerStakeholder(consumer.address, Role.Consumer, "John Doe");
  });

  // ── Deployment ──────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("should set deployer as admin", async function () {
      const stake = await contract.getStakeholder(admin.address);
      expect(stake.role).to.equal(Role.Admin);
      expect(stake.isRegistered).to.be.true;
    });

    it("should track admin in allStakeholders", async function () {
      const all = await contract.getAllStakeholders();
      expect(all).to.include(admin.address);
    });
  });

  // ── Stakeholder Registration ────────────────────────────────────────
  describe("Stakeholder Registration", function () {
    it("should register a manufacturer", async function () {
      const stake = await contract.getStakeholder(manufacturer.address);
      expect(stake.role).to.equal(Role.Manufacturer);
      expect(stake.name).to.equal("PharmaCorp");
    });

    it("should reject duplicate registration", async function () {
      await expect(
        contract.registerStakeholder(manufacturer.address, Role.Distributor, "Duplicate")
      ).to.be.revertedWith("Stakeholder already registered");
    });

    it("should reject registration by non-admin", async function () {
      await expect(
        contract.connect(manufacturer).registerStakeholder(unauthorized.address, Role.Distributor, "Hacker")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("should reject Role.None registration", async function () {
      await expect(
        contract.registerStakeholder(unauthorized.address, Role.None, "Nobody")
      ).to.be.revertedWith("Invalid role");
    });

    it("should emit StakeholderRegistered event", async function () {
      const [, , , , , , newAddr] = await ethers.getSigners();
      await expect(contract.registerStakeholder(newAddr.address, Role.Distributor, "NewDist"))
        .to.emit(contract, "StakeholderRegistered")
        .withArgs(newAddr.address, Role.Distributor, "NewDist");
    });
  });

  // ── Batch Creation ──────────────────────────────────────────────────
  describe("Batch Creation", function () {
    const batchId = "BATCH-001";
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-metadata"));
    const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root-test"));
    const totalUnits = 1000;

    it("should allow manufacturer to create batch with merkle root", async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits);
      const batch = await contract.getBatch(batchId);
      expect(batch.manufacturer).to.equal(manufacturer.address);
      expect(batch.currentOwner).to.equal(manufacturer.address);
      expect(batch.isActive).to.be.true;
      expect(batch.unitsMerkleRoot).to.equal(merkleRoot);
      expect(batch.totalUnits).to.equal(totalUnits);
    });

    it("should allow creating batch with zero merkle root (legacy mode)", async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, ZERO_MERKLE_ROOT, 0);
      const batch = await contract.getBatch(batchId);
      expect(batch.isActive).to.be.true;
      expect(batch.totalUnits).to.equal(0);
    });

    it("should reject batch creation by non-manufacturer", async function () {
      await expect(
        contract.connect(distributor).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits)
      ).to.be.revertedWith("Only manufacturers can create batches");
    });

    it("should reject duplicate batch IDs", async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits);
      await expect(
        contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits)
      ).to.be.revertedWith("Batch ID already exists");
    });

    it("should reject expired expiry date", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 1000;
      await expect(
        contract.connect(manufacturer).createBatch(batchId, dataHash, pastExpiry, merkleRoot, totalUnits)
      ).to.be.revertedWith("Expiry date must be in the future");
    });

    it("should emit BatchCreated event", async function () {
      await expect(contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits))
        .to.emit(contract, "BatchCreated")
        .withArgs(batchId, manufacturer.address, futureExpiry, dataHash);
    });

    it("should track batch in allBatchIds", async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits);
      const all = await contract.getAllBatchIds();
      expect(all).to.include(batchId);
    });
  });

  // ── Batch Transfer ──────────────────────────────────────────────────
  describe("Batch Transfer", function () {
    const batchId = "BATCH-002";
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("transfer-test"));
    const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    beforeEach(async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, ZERO_MERKLE_ROOT, 0);
    });

    it("should transfer from manufacturer to distributor", async function () {
      await contract.connect(manufacturer).transferBatch(batchId, distributor.address);
      const batch = await contract.getBatch(batchId);
      expect(batch.currentOwner).to.equal(distributor.address);
      expect(batch.transferCount).to.equal(1);
    });

    it("should follow full supply chain flow", async function () {
      await contract.connect(manufacturer).transferBatch(batchId, distributor.address);
      await contract.connect(distributor).transferBatch(batchId, pharmacy.address);
      await contract.connect(pharmacy).transferBatch(batchId, consumer.address);

      const batch = await contract.getBatch(batchId);
      expect(batch.currentOwner).to.equal(consumer.address);
      expect(batch.transferCount).to.equal(3);
    });

    it("should record transfer history", async function () {
      await contract.connect(manufacturer).transferBatch(batchId, distributor.address);
      await contract.connect(distributor).transferBatch(batchId, pharmacy.address);

      const history = await contract.getBatchHistory(batchId);
      expect(history.length).to.equal(2);
      expect(history[0].from).to.equal(manufacturer.address);
      expect(history[0].to).to.equal(distributor.address);
      expect(history[1].from).to.equal(distributor.address);
      expect(history[1].to).to.equal(pharmacy.address);
    });

    it("should reject invalid transfer order (manufacturer → consumer)", async function () {
      await expect(
        contract.connect(manufacturer).transferBatch(batchId, consumer.address)
      ).to.be.revertedWith("Invalid transfer: does not follow supply chain order");
    });

    it("should reject transfer by non-owner", async function () {
      await expect(
        contract.connect(distributor).transferBatch(batchId, pharmacy.address)
      ).to.be.revertedWith("Only current owner can perform this action");
    });

    it("should reject transfer to unregistered address", async function () {
      await expect(
        contract.connect(manufacturer).transferBatch(batchId, unauthorized.address)
      ).to.be.revertedWith("Recipient is not a registered stakeholder");
    });

    it("should emit BatchTransferred event", async function () {
      await expect(contract.connect(manufacturer).transferBatch(batchId, distributor.address))
        .to.emit(contract, "BatchTransferred");
    });
  });

  // ── Batch Verification ──────────────────────────────────────────────
  describe("Batch Verification", function () {
    const batchId = "BATCH-003";
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("verify-test"));
    const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    beforeEach(async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, ZERO_MERKLE_ROOT, 0);
    });

    it("should verify a valid batch", async function () {
      const result = await contract.verifyBatch(batchId);
      expect(result.isValid).to.be.true;
      expect(result.manufacturer).to.equal(manufacturer.address);
      expect(result.isExpired).to.be.false;
    });

    it("should report non-existent batch as invalid", async function () {
      const result = await contract.verifyBatch("FAKE-BATCH");
      expect(result.isValid).to.be.false;
    });
  });

  // ── Merkle Root ─────────────────────────────────────────────────────
  describe("Merkle Root (Unit-Level Tracking)", function () {
    const batchId = "BATCH-MERKLE-001";
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("merkle-test"));
    const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("test-merkle-root-of-10000-units"));
    const totalUnits = 10000;

    beforeEach(async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, merkleRoot, totalUnits);
    });

    it("should store and return correct merkle root", async function () {
      const result = await contract.getBatchMerkleRoot(batchId);
      expect(result.merkleRoot).to.equal(merkleRoot);
      expect(result.totalUnits).to.equal(totalUnits);
    });

    it("should return zero merkle root for non-existent batch", async function () {
      const result = await contract.getBatchMerkleRoot("NON-EXISTENT");
      expect(result.merkleRoot).to.equal(ZERO_MERKLE_ROOT);
      expect(result.totalUnits).to.equal(0);
    });

    it("should include merkle root in getBatch response", async function () {
      const batch = await contract.getBatch(batchId);
      expect(batch.unitsMerkleRoot).to.equal(merkleRoot);
      expect(batch.totalUnits).to.equal(totalUnits);
    });
  });

  // ── Batch Deactivation ─────────────────────────────────────────────
  describe("Batch Deactivation", function () {
    const batchId = "BATCH-004";
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("deactivate-test"));
    const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    beforeEach(async function () {
      await contract.connect(manufacturer).createBatch(batchId, dataHash, futureExpiry, ZERO_MERKLE_ROOT, 0);
    });

    it("should allow admin to deactivate", async function () {
      await contract.connect(admin).deactivateBatch(batchId);
      const batch = await contract.getBatch(batchId);
      expect(batch.isActive).to.be.false;
    });

    it("should allow manufacturer to deactivate own batch", async function () {
      await contract.connect(manufacturer).deactivateBatch(batchId);
      const batch = await contract.getBatch(batchId);
      expect(batch.isActive).to.be.false;
    });

    it("should reject deactivation by unauthorized user", async function () {
      await expect(
        contract.connect(distributor).deactivateBatch(batchId)
      ).to.be.revertedWith("Only admin or original manufacturer can deactivate");
    });
  });
});
