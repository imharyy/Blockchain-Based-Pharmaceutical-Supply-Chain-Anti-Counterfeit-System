# ⛓️ PharmaChain — Blockchain-Based Pharmaceutical Supply Chain & Anti-Counterfeit System

A full-stack decentralized application that tracks medicine batches from manufacturer to consumer using Ethereum smart contracts, providing end-to-end supply chain transparency and counterfeit detection.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   React Frontend│────▶│  Express Backend  │────▶│  Ethereum Blockchain│
│   (Vite + React)│     │  (Node.js + JWT)  │     │  (Hardhat / Solidity)│
│                 │     │                   │     │                     │
│  • Role UIs     │     │  • REST APIs      │     │  • PharmSupplyChain │
│  • QR Scanner   │     │  • QR Generation  │     │  • Role-based ACL   │
│  • Ethers.js    │     │  • Anomaly Detect  │     │  • Transfer Chain   │
│  • Supply Chain │     │  • JWT Auth       │     │  • Events / Audit   │
│    Timeline     │     │                   │     │                     │
└─────────────────┘     └────────┬──────────┘     └─────────────────────┘
                                 │
                        ┌────────▼──────────┐
                        │   MongoDB Atlas   │
                        │  (Off-Chain Data) │
                        │                   │
                        │  • User profiles  │
                        │  • Batch metadata │
                        │  • Scan logs      │
                        │  • QR codes       │
                        └───────────────────┘
```

## 📁 Project Structure

```
blockchain project/
├── contracts/                    # Solidity smart contracts
│   └── PharmSupplyChain.sol      # Main contract (roles, batches, transfers)
├── scripts/
│   └── deploy.js                 # Deployment script + sample data
├── test/
│   └── PharmSupplyChain.test.js  # 25 comprehensive tests
├── backend/                      # Node.js Express API
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── blockchain.js         # Ethers.js provider setup
│   ├── models/
│   │   ├── User.js               # User model (bcrypt hashing)
│   │   ├── BatchMetadata.js      # Off-chain medicine data
│   │   └── ScanLog.js            # QR scan audit trail
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── roleCheck.js          # Role-based access control
│   ├── routes/
│   │   ├── auth.js               # Register/Login/Profile
│   │   ├── batch.js              # Create/Transfer/Query batches
│   │   ├── verify.js             # QR scan + anomaly detection
│   │   └── admin.js              # Dashboard + stakeholder mgmt
│   ├── services/
│   │   ├── qrService.js          # QR code generation
│   │   ├── anomalyService.js     # Counterfeit detection logic
│   │   └── blockchainService.js  # Smart contract wrapper
│   └── server.js                 # Express entry point
├── frontend/                     # React + Vite UI
│   └── src/
│       ├── components/           # Reusable UI components
│       ├── pages/                # Role-based dashboard pages
│       ├── context/              # Auth state management
│       └── services/             # API + blockchain clients
├── hardhat.config.js
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** account (free tier works)
- **MetaMask** browser extension (optional, for wallet interaction)

### Step 1: Clone & Install

```bash
# Install root dependencies (Hardhat)
cd "blockchain project"
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Start Local Blockchain

Open a **dedicated terminal** — keep this running:

```bash
npx hardhat node
```

This starts a local Ethereum node on `http://127.0.0.1:8545` with 20 test accounts.

**Save the first account's private key** (Account #0) — this is the admin/deployer.

### Step 3: Deploy Smart Contract

In a **new terminal**:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This will:
- Deploy the PharmSupplyChain contract
- Register sample stakeholders (manufacturer, distributor, pharmacy, consumer)
- Save deployment info to `deployment.json`

**Copy the contract address** from the output.

### Step 4: Configure Environment Variables

**Backend** — Edit `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<your-user>:<your-password>@cluster0.xxxxx.mongodb.net/pharma-supply-chain?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
PORT=5000
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<paste-contract-address-from-step-3>
ADMIN_PRIVATE_KEY=<paste-account-0-private-key-from-step-2>
```

**Frontend** — Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_CONTRACT_ADDRESS=<paste-contract-address-from-step-3>
VITE_RPC_URL=http://127.0.0.1:8545
```

### Step 5: Start Backend

```bash
cd backend
npm run dev
```

Server starts on `http://localhost:5000`.

### Step 6: Start Frontend

```bash
cd frontend
npm run dev
```

UI available at `http://localhost:5173`.

---

## 👥 User Roles & Test Accounts

When you run `npx hardhat node`, it generates 20 accounts. The deployment script assigns:

| Role | Account # | Usage |
|------|-----------|-------|
| Admin | #0 | System admin (deployer) |
| Manufacturer | #1 | Creates medicine batches |
| Distributor | #2 | Receives from manufacturer, sends to pharmacy |
| Pharmacy | #3 | Receives from distributor, dispenses to consumer |
| Consumer | #4 | Verifies medicine via QR |

Use these wallet addresses and private keys when registering users through the UI.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get profile (auth required) |
| GET | `/api/auth/users` | List all users (admin) |

### Batch Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batch/create` | Create batch (manufacturer) |
| POST | `/api/batch/transfer` | Transfer ownership |
| GET | `/api/batch` | List batches (filtered by role) |
| GET | `/api/batch/:batchId` | Get batch details |
| GET | `/api/batch/:batchId/history` | Get supply chain history |
| GET | `/api/batch/:batchId/qr` | Get QR code |

### Verification & Scanning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verify/scan` | Scan QR + anomaly detection |
| GET | `/api/verify/:batchId` | Quick verify (no scan log) |
| GET | `/api/verify/:batchId/scans` | Get scan logs |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| POST | `/api/admin/register-stakeholder` | Register on blockchain |
| GET | `/api/admin/stakeholders` | List stakeholders |

---

## 🔐 Smart Contract

### Key Features

- **Role-based access control**: Admin, Manufacturer, Distributor, Pharmacy, Consumer
- **Supply chain enforcement**: Transfers must follow Manufacturer → Distributor → Pharmacy → Consumer
- **On-chain data minimization**: Only stores batch IDs, addresses, timestamps, and metadata hashes
- **Event emission**: All state changes emit events for audit trails
- **Batch deactivation**: Admin or manufacturer can recall batches

### Contract Functions

```solidity
// Stakeholder management
registerStakeholder(address, Role, name)    // Admin only
getStakeholder(address) → Stakeholder
getAllStakeholders() → address[]

// Batch lifecycle
createBatch(batchId, dataHash, expiryDate)  // Manufacturer only
transferBatch(batchId, newOwner)            // Current owner, valid chain
deactivateBatch(batchId)                   // Admin or manufacturer

// Queries
getBatch(batchId) → Batch
getBatchHistory(batchId) → TransferRecord[]
verifyBatch(batchId) → (isValid, manufacturer, owner, expiry, transfers, isExpired)
```

### Running Tests

```bash
npx hardhat test
```

All **25 tests** cover:
- Deployment & admin setup
- Stakeholder registration (valid, duplicate, unauthorized)
- Batch creation (valid, non-manufacturer, duplicate, expired)
- Batch transfers (valid chain, full flow, invalid order, unauthorized)
- Batch verification (valid, non-existent)
- Batch deactivation (admin, manufacturer, unauthorized)

---

## 🛡️ Anti-Counterfeit Features

### Anomaly Detection

The system detects suspicious activity through:

1. **Duplicate Scans**: >10 scans of same batch within 1 hour
2. **Multi-Location Scanning**: Same batch scanned from >3 different locations in 1 hour
3. **Rapid Scanning**: Less than 5 seconds between consecutive scans
4. **Multiple IP Addresses**: >5 unique IPs scanning the same batch

### Verification Results

| Result | Meaning |
|--------|---------|
| ✅ **Valid** | Authentic product, verified on blockchain |
| ⚠️ **Suspicious** | Anomaly detected, possible counterfeit |
| ⏰ **Expired** | Past expiry date |
| 🚫 **Invalid** | Not found on blockchain, likely counterfeit |

---

## 🔄 Complete Workflow Demo

1. **Register** as a Manufacturer (use Hardhat Account #1 address + private key)
2. **Create a batch**: Fill in medicine details → batch is created on-chain + QR generated
3. **Register** a Distributor (Account #2), Pharmacy (Account #3), Consumer (Account #4)
4. **Transfer** batch: Manufacturer → Distributor → Pharmacy → Consumer
5. **Verify**: Consumer scans QR code → sees full supply chain history
6. **Anomaly Test**: Scan the same batch multiple times rapidly → "Suspicious" flag appears

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Ethereum (Hardhat local network) |
| Smart Contracts | Solidity 0.8.19 |
| Backend | Node.js, Express, JWT |
| Frontend | React 18, Vite, React Router |
| Blockchain Client | Ethers.js v6 |
| Database | MongoDB Atlas |
| QR Code | qrcode (generation), html5-qrcode (scanning) |
| Testing | Chai, Mocha (Hardhat Toolbox) |

---

## ⚠️ Important Notes

- This is a **development/demo** project using a local Hardhat blockchain
- Private keys are stored for demo purposes — **NEVER do this in production**
- The system is designed to demonstrate blockchain supply chain concepts
- For production: use testnets/mainnet, hardware wallets, and proper key management
- MongoDB Atlas free tier is sufficient for demo usage

---

## 📄 License

MIT License — Built for educational and demonstration purposes.
