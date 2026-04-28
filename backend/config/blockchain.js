const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

let provider;
let contract;
let adminWallet;

/**
 * Initialize blockchain connection and contract instance.
 * Reads the compiled ABI from Hardhat artifacts.
 */
function initBlockchain() {
  try {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(rpcUrl);

    // Load contract ABI from Hardhat artifacts
    const artifactPath = path.join(
      __dirname,
      "../../artifacts/contracts/PharmSupplyChain.sol/PharmSupplyChain.json"
    );

    if (!fs.existsSync(artifactPath)) {
      console.error("  ⚠️  Contract artifact not found. Run 'npx hardhat compile' first.");
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      console.error("  ⚠️  CONTRACT_ADDRESS not set in .env");
      return null;
    }

    // Admin wallet for server-side contract calls
    if (process.env.ADMIN_PRIVATE_KEY) {
      adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
      contract = new ethers.Contract(contractAddress, artifact.abi, adminWallet);
    } else {
      contract = new ethers.Contract(contractAddress, artifact.abi, provider);
    }

    console.log(`  ✅ Blockchain connected: ${rpcUrl}`);
    console.log(`  ✅ Contract: ${contractAddress}`);
    return contract;
  } catch (error) {
    console.error(`  ❌ Blockchain init error: ${error.message}`);
    return null;
  }
}

function getContract() {
  return contract;
}

function getProvider() {
  return provider;
}

function getAdminWallet() {
  return adminWallet;
}

/**
 * Get a contract instance connected to a specific wallet.
 */
function getContractWithSigner(privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);
  return contract.connect(wallet);
}

module.exports = {
  initBlockchain,
  getContract,
  getProvider,
  getAdminWallet,
  getContractWithSigner,
};
