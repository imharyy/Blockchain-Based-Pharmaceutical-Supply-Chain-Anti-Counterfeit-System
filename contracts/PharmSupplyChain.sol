// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PharmSupplyChain
 * @notice Blockchain-based pharmaceutical supply chain tracking and anti-counterfeit system.
 * @dev Stores only critical verification data on-chain. Metadata is kept off-chain (MongoDB).
 *
 * Roles: Admin, Manufacturer, Distributor, Pharmacy, Consumer
 * Flow:  Manufacturer → Distributor → Pharmacy → Consumer
 *
 * Unit-Level Tracking:
 * Each batch stores a Merkle root of all unit serial numbers. Individual unit data
 * is kept off-chain (MongoDB) for cost efficiency. The Merkle root allows anyone to
 * cryptographically prove a unit belongs to a batch without storing all unit data on-chain.
 */
contract PharmSupplyChain {

    // ─── Enums ────────────────────────────────────────────────────────────────────
    enum Role { None, Admin, Manufacturer, Distributor, Pharmacy, Consumer }

    // ─── Structs ──────────────────────────────────────────────────────────────────
    struct Stakeholder {
        address addr;
        Role    role;
        bool    isRegistered;
        string  name;
    }

    struct Batch {
        string   batchId;        // Human-readable batch identifier
        address  manufacturer;   // Original creator
        address  currentOwner;   // Current holder
        uint256  createdAt;      // Block timestamp of creation
        uint256  expiryDate;     // Unix timestamp of expiry
        bytes32  dataHash;       // Hash of off-chain metadata for integrity
        bytes32  unitsMerkleRoot; // Merkle root of all unit serial numbers
        uint256  totalUnits;     // Total number of individual units in this batch
        bool     isActive;       // Whether batch is still valid
        uint8    transferCount;  // Number of ownership transfers
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
        Role    fromRole;
        Role    toRole;
    }

    // ─── State Variables ──────────────────────────────────────────────────────────

    address public admin;

    /// @dev stakeholder address → Stakeholder info
    mapping(address => Stakeholder) public stakeholders;

    /// @dev batchId (string) → Batch data
    mapping(string => Batch) public batches;

    /// @dev batchId → array of transfer records
    mapping(string => TransferRecord[]) private batchHistory;

    /// @dev Track all batch IDs for enumeration
    string[] public allBatchIds;

    /// @dev Track all stakeholder addresses
    address[] public allStakeholders;

    // ─── Events ───────────────────────────────────────────────────────────────────

    event StakeholderRegistered(address indexed stakeholder, Role role, string name);
    event BatchCreated(string indexed batchId, address indexed manufacturer, uint256 expiryDate, bytes32 dataHash);
    event BatchTransferred(string indexed batchId, address indexed from, address indexed to, Role fromRole, Role toRole, uint256 timestamp);
    event BatchDeactivated(string indexed batchId, address indexed by);

    // ─── Modifiers ────────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(stakeholders[msg.sender].role == Role.Admin, "Only admin can perform this action");
        _;
    }

    modifier onlyRegistered() {
        require(stakeholders[msg.sender].isRegistered, "Caller is not a registered stakeholder");
        _;
    }

    modifier onlyBatchOwner(string memory _batchId) {
        require(batches[_batchId].currentOwner == msg.sender, "Only current owner can perform this action");
        _;
    }

    modifier batchExists(string memory _batchId) {
        require(batches[_batchId].isActive, "Batch does not exist or is deactivated");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
        stakeholders[msg.sender] = Stakeholder({
            addr: msg.sender,
            role: Role.Admin,
            isRegistered: true,
            name: "System Admin"
        });
        allStakeholders.push(msg.sender);
        emit StakeholderRegistered(msg.sender, Role.Admin, "System Admin");
    }

    // ─── Stakeholder Management ───────────────────────────────────────────────────

    /**
     * @notice Register a new stakeholder with a specific role.
     * @param _addr      Wallet address of the stakeholder
     * @param _role      Role to assign (1=Admin, 2=Manufacturer, 3=Distributor, 4=Pharmacy, 5=Consumer)
     * @param _name      Human-readable name
     */
    function registerStakeholder(address _addr, Role _role, string memory _name) external onlyAdmin {
        require(!stakeholders[_addr].isRegistered, "Stakeholder already registered");
        require(_role != Role.None, "Invalid role");

        stakeholders[_addr] = Stakeholder({
            addr: _addr,
            role: _role,
            isRegistered: true,
            name: _name
        });
        allStakeholders.push(_addr);
        emit StakeholderRegistered(_addr, _role, _name);
    }

    /**
     * @notice Get stakeholder info by address.
     */
    function getStakeholder(address _addr) external view returns (Stakeholder memory) {
        return stakeholders[_addr];
    }

    /**
     * @notice Get all registered stakeholder addresses.
     */
    function getAllStakeholders() external view returns (address[] memory) {
        return allStakeholders;
    }

    // ─── Batch Management ─────────────────────────────────────────────────────────

    /**
     * @notice Create a new medicine batch. Only manufacturers can create batches.
     * @param _batchId         Unique batch identifier
     * @param _dataHash        keccak256 hash of off-chain metadata for integrity verification
     * @param _expiryDate      Unix timestamp for batch expiry
     * @param _unitsMerkleRoot Merkle root of all unit serial numbers (for unit-level verification)
     * @param _totalUnits      Total number of individual units in this batch
     */
    function createBatch(
        string memory _batchId,
        bytes32 _dataHash,
        uint256 _expiryDate,
        bytes32 _unitsMerkleRoot,
        uint256 _totalUnits
    ) external onlyRegistered {
        require(stakeholders[msg.sender].role == Role.Manufacturer, "Only manufacturers can create batches");
        require(!batches[_batchId].isActive, "Batch ID already exists");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");

        batches[_batchId] = Batch({
            batchId: _batchId,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            createdAt: block.timestamp,
            expiryDate: _expiryDate,
            dataHash: _dataHash,
            unitsMerkleRoot: _unitsMerkleRoot,
            totalUnits: _totalUnits,
            isActive: true,
            transferCount: 0
        });

        allBatchIds.push(_batchId);
        emit BatchCreated(_batchId, msg.sender, _expiryDate, _dataHash);
    }

    /**
     * @notice Transfer batch ownership following the supply chain:
     *         Manufacturer → Distributor → Pharmacy → Consumer.
     * @param _batchId   The batch to transfer
     * @param _newOwner  Address of the new owner
     */
    function transferBatch(
        string memory _batchId,
        address _newOwner
    ) external onlyRegistered batchExists(_batchId) onlyBatchOwner(_batchId) {
        require(stakeholders[_newOwner].isRegistered, "Recipient is not a registered stakeholder");

        Role senderRole = stakeholders[msg.sender].role;
        Role receiverRole = stakeholders[_newOwner].role;

        // Enforce supply chain flow
        require(_isValidTransfer(senderRole, receiverRole), "Invalid transfer: does not follow supply chain order");

        // Record transfer
        batchHistory[_batchId].push(TransferRecord({
            from: msg.sender,
            to: _newOwner,
            timestamp: block.timestamp,
            fromRole: senderRole,
            toRole: receiverRole
        }));

        batches[_batchId].currentOwner = _newOwner;
        batches[_batchId].transferCount += 1;

        emit BatchTransferred(_batchId, msg.sender, _newOwner, senderRole, receiverRole, block.timestamp);
    }

    /**
     * @notice Deactivate a batch (e.g., recalled or expired). Only admin or manufacturer.
     */
    function deactivateBatch(string memory _batchId) external batchExists(_batchId) {
        require(
            stakeholders[msg.sender].role == Role.Admin ||
            batches[_batchId].manufacturer == msg.sender,
            "Only admin or original manufacturer can deactivate"
        );
        batches[_batchId].isActive = false;
        emit BatchDeactivated(_batchId, msg.sender);
    }

    // ─── Query Functions ──────────────────────────────────────────────────────────

    /**
     * @notice Get batch details by ID.
     */
    function getBatch(string memory _batchId) external view returns (Batch memory) {
        return batches[_batchId];
    }

    /**
     * @notice Get full transfer history of a batch.
     */
    function getBatchHistory(string memory _batchId) external view returns (TransferRecord[] memory) {
        return batchHistory[_batchId];
    }

    /**
     * @notice Verify a batch — returns validity, current owner, and manufacturer.
     */
    function verifyBatch(string memory _batchId) external view returns (
        bool isValid,
        address manufacturer,
        address currentOwner,
        uint256 expiryDate,
        uint8 transferCount,
        bool isExpired
    ) {
        Batch memory b = batches[_batchId];
        isValid = b.isActive && bytes(b.batchId).length > 0;
        manufacturer = b.manufacturer;
        currentOwner = b.currentOwner;
        expiryDate = b.expiryDate;
        transferCount = b.transferCount;
        isExpired = block.timestamp > b.expiryDate;
    }

    /**
     * @notice Get the Merkle root and total unit count for a batch.
     * @param _batchId The batch to query
     * @return merkleRoot The Merkle root of all unit serial numbers
     * @return totalUnits The total number of units in this batch
     */
    function getBatchMerkleRoot(string memory _batchId) external view returns (
        bytes32 merkleRoot,
        uint256 totalUnits
    ) {
        Batch memory b = batches[_batchId];
        merkleRoot = b.unitsMerkleRoot;
        totalUnits = b.totalUnits;
    }

    /**
     * @notice Get all batch IDs.
     */
    function getAllBatchIds() external view returns (string[] memory) {
        return allBatchIds;
    }

    /**
     * @notice Get total number of batches.
     */
    function getBatchCount() external view returns (uint256) {
        return allBatchIds.length;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────────

    /**
     * @dev Validate that a transfer follows the correct supply chain order.
     *      Manufacturer → Distributor → Pharmacy → Consumer
     */
    function _isValidTransfer(Role _from, Role _to) internal pure returns (bool) {
        if (_from == Role.Manufacturer && _to == Role.Distributor) return true;
        if (_from == Role.Distributor && _to == Role.Pharmacy) return true;
        if (_from == Role.Pharmacy && _to == Role.Consumer) return true;
        return false;
    }
}
