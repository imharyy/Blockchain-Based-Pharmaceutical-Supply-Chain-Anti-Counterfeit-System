// scripts/deploy.js
// Deploys PharmSupplyChain and registers sample stakeholders on the local Hardhat network.

const hre = require("hardhat");

async function main() {
  const [deployer, manufacturer, distributor, pharmacy, consumer] = await hre.ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deploying PharmSupplyChain Contract");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Deployer (Admin): ${deployer.address}`);

  // Deploy contract
  const PharmSupplyChain = await hre.ethers.getContractFactory("PharmSupplyChain");
  const contract = await PharmSupplyChain.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`\n  ✅ Contract deployed to: ${contractAddress}`);

  // Register sample stakeholders
  console.log("\n  Registering sample stakeholders...");

  // Role enum: 0=None, 1=Admin, 2=Manufacturer, 3=Distributor, 4=Pharmacy, 5=Consumer
  if (manufacturer) {
    const tx1 = await contract.registerStakeholder(manufacturer.address, 2, "PharmaCorp Inc.");
    await tx1.wait();
    console.log(`  ✅ Manufacturer registered: ${manufacturer.address}`);
  }

  if (distributor) {
    const tx2 = await contract.registerStakeholder(distributor.address, 3, "MedDistribute LLC");
    await tx2.wait();
    console.log(`  ✅ Distributor registered: ${distributor.address}`);
  }

  if (pharmacy) {
    const tx3 = await contract.registerStakeholder(pharmacy.address, 4, "HealthPlus Pharmacy");
    await tx3.wait();
    console.log(`  ✅ Pharmacy registered: ${pharmacy.address}`);
  }

  if (consumer) {
    const tx4 = await contract.registerStakeholder(consumer.address, 5, "John Doe");
    await tx4.wait();
    console.log(`  ✅ Consumer registered: ${consumer.address}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployment Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Contract Address : ${contractAddress}`);
  console.log(`  Admin            : ${deployer.address}`);
  if (manufacturer) console.log(`  Manufacturer     : ${manufacturer.address}`);
  if (distributor)  console.log(`  Distributor      : ${distributor.address}`);
  if (pharmacy)     console.log(`  Pharmacy         : ${pharmacy.address}`);
  if (consumer)     console.log(`  Consumer         : ${consumer.address}`);
  console.log("");
  console.log("  📦 Contract now supports unit-level tracking:");
  console.log("     - Batch creation with Merkle root for unit verification");
  console.log("     - getBatchMerkleRoot() for on-chain unit proof validation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Write deployment info to a JSON file for backend/frontend consumption
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress,
    admin: deployer.address,
    manufacturer: manufacturer?.address,
    distributor: distributor?.address,
    pharmacy: pharmacy?.address,
    consumer: consumer?.address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("  📄 Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
