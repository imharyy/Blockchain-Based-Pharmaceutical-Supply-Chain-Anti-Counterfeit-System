# Walkthrough — PharmaChain Supply Chain System

## Summary

Built a complete **Blockchain-Based Pharmaceutical Supply Chain and Anti-Counterfeit System** with 5 user roles, smart contract-enforced supply chain tracking, QR code verification, and anomaly-based counterfeit detection.

## What Was Built

### 1. Smart Contract — `PharmSupplyChain.sol`
- 5 roles: Admin, Manufacturer, Distributor, Pharmacy, Consumer
- Batch creation with keccak256 metadata hash for integrity
- Transfer chain enforcement: Manufacturer → Distributor → Pharmacy → Consumer
- Events for all state changes (`BatchCreated`, `BatchTransferred`, `StakeholderRegistered`)
- Batch deactivation (recall) capability
- **25 comprehensive tests — all passing** ✅

### 2. Backend — Node.js/Express API
- **JWT authentication** with bcrypt password hashing
- **Role-based access control** middleware
- **Batch lifecycle**: Create on-chain + off-chain, transfer with blockchain signing
- **QR code generation** with verification URLs
- **Anomaly detection service**: Duplicate scans, multi-location scanning, rapid scans
- **Scan logging** for audit trail and counterfeit detection
- **Admin dashboard** API with system stats

### 3. Frontend — React/Vite
- **Premium dark theme** with glassmorphism, gradients, and micro-animations
- **5 role-based dashboards** with relevant features per role
- **QR Scanner** with dual mode: camera-based + text input fallback
- **Supply chain timeline** with animated visualization
- **Verification page** showing blockchain data, medicine info, anomaly alerts
- **Status badges**: Valid ✅, Suspicious ⚠️, Expired ⏰, Invalid 🚫

### 4. On-Chain vs Off-Chain Separation
| On-Chain | Off-Chain (MongoDB) |
|----------|-------------------|
| Batch ID, manufacturer, owner, transfers | Medicine name, description, dosage |
| Metadata hash (keccak256) | QR codes, images, side effects |
| Transfer timestamps | User profiles, passwords |
| Batch active status | Scan logs, anomaly data |

## Files Created

| Directory | Files | Purpose |
|-----------|-------|---------|
| `/contracts` | 1 Solidity file | Smart contract |
| `/scripts` | 1 JS file | Deployment + sample data |
| `/test` | 1 test file (25 tests) | Contract testing |
| `/backend` | 14 files | REST API server |
| `/frontend/src` | 15 files | React UI |
| Root | 4 config files | Hardhat, env, README |

**Total: ~35 files**

## Validation Results

- ✅ Solidity compilation successful (0.8.19)
- ✅ All 25 smart contract tests passing
- ✅ Frontend production build successful (694ms)
- ✅ Backend dependencies installed
- ✅ All npm packages resolved

## To Run

See [README.md](file:///c:/Users/harsh/Desktop/blockchain%20project/README.md) for complete setup steps. In short:

1. `npx hardhat node` — Start blockchain
2. `npx hardhat run scripts/deploy.js --network localhost` — Deploy contract
3. Set contract address in `.env` files
4. `cd backend && npm run dev` — Start API
5. `cd frontend && npm run dev` — Start UI
