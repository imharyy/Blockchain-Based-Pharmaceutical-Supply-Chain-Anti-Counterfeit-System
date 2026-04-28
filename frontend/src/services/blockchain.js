import { ethers } from 'ethers';

// Contract ABI — key functions only (to avoid needing the full artifact)
// Updated to include the new Batch struct fields and getBatchMerkleRoot function
const CONTRACT_ABI = [
  "function getBatch(string memory _batchId) external view returns (tuple(string batchId, address manufacturer, address currentOwner, uint256 createdAt, uint256 expiryDate, bytes32 dataHash, bytes32 unitsMerkleRoot, uint256 totalUnits, bool isActive, uint8 transferCount))",
  "function getBatchHistory(string memory _batchId) external view returns (tuple(address from, address to, uint256 timestamp, uint8 fromRole, uint8 toRole)[])",
  "function verifyBatch(string memory _batchId) external view returns (bool isValid, address manufacturer, address currentOwner, uint256 expiryDate, uint8 transferCount, bool isExpired)",
  "function getBatchMerkleRoot(string memory _batchId) external view returns (bytes32 merkleRoot, uint256 totalUnits)",
  "function getStakeholder(address _addr) external view returns (tuple(address addr, uint8 role, bool isRegistered, string name))",
  "function getAllBatchIds() external view returns (string[] memory)",
  "function getAllStakeholders() external view returns (address[] memory)",
  "event BatchCreated(string indexed batchId, address indexed manufacturer, uint256 expiryDate, bytes32 dataHash)",
  "event BatchTransferred(string indexed batchId, address indexed from, address indexed to, uint8 fromRole, uint8 toRole, uint256 timestamp)",
];

const ROLE_NAMES = {
  0: 'None',
  1: 'Admin',
  2: 'Manufacturer',
  3: 'Distributor',
  4: 'Pharmacy',
  5: 'Consumer',
};

let provider = null;
let contract = null;

export function initBlockchain() {
  try {
    const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

    if (!contractAddress) {
      console.warn('VITE_CONTRACT_ADDRESS not set');
      return null;
    }

    provider = new ethers.JsonRpcProvider(rpcUrl);
    contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
    return contract;
  } catch (err) {
    console.error('Blockchain init failed:', err);
    return null;
  }
}

export async function verifyBatchOnChain(batchId) {
  if (!contract) initBlockchain();
  if (!contract) return null;

  try {
    const result = await contract.verifyBatch(batchId);
    return {
      isValid: result.isValid,
      manufacturer: result.manufacturer,
      currentOwner: result.currentOwner,
      expiryDate: Number(result.expiryDate),
      transferCount: Number(result.transferCount),
      isExpired: result.isExpired,
    };
  } catch (err) {
    console.error('Chain verify failed:', err);
    return null;
  }
}

export async function getBatchHistoryOnChain(batchId) {
  if (!contract) initBlockchain();
  if (!contract) return [];

  try {
    const history = await contract.getBatchHistory(batchId);
    return history.map((r) => ({
      from: r.from,
      to: r.to,
      timestamp: Number(r.timestamp),
      fromRole: ROLE_NAMES[Number(r.fromRole)] || 'Unknown',
      toRole: ROLE_NAMES[Number(r.toRole)] || 'Unknown',
    }));
  } catch (err) {
    console.error('Chain history failed:', err);
    return [];
  }
}

export async function getBatchMerkleRootOnChain(batchId) {
  if (!contract) initBlockchain();
  if (!contract) return null;

  try {
    const result = await contract.getBatchMerkleRoot(batchId);
    return {
      merkleRoot: result.merkleRoot,
      totalUnits: Number(result.totalUnits),
    };
  } catch (err) {
    console.error('Chain merkle root failed:', err);
    return null;
  }
}

export function getRoleName(roleNum) {
  return ROLE_NAMES[roleNum] || 'Unknown';
}

export function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTimestamp(ts) {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  return date.toLocaleString();
}
