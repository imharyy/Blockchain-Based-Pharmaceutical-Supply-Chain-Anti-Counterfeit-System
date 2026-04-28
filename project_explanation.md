# PharmaChain — Complete Project Explanation (Presentation Guide)

---

## 1. THE PROBLEM

**Counterfeit medicines kill ~1 million people per year globally** (WHO estimate). The pharma supply chain has a trust problem:

- A medicine passes through **4+ parties**: Manufacturer → Distributor → Pharmacy → Consumer
- At each step, there's no easy way to prove the medicine is genuine
- Paper records can be forged, databases can be hacked
- **Consumers buy individual packets** (not full batches), so batch-level QR codes don't help them

### What we're solving:
1. **Traceability** — Track every medicine from factory to consumer
2. **Authenticity** — Let anyone verify a medicine is real, using blockchain
3. **Anti-counterfeit** — Detect duplicate, cloned, or suspicious products
4. **Unit-level verification** — Each individual packet can be verified, not just batches

---

## 2. TECHNOLOGY STACK

| Layer | Technology | Why we chose it |
|---|---|---|
| **Blockchain** | Ethereum (Solidity 0.8.19) | Most mature smart contract platform, immutable records |
| **Local Blockchain** | Hardhat (local node) | Free testing, instant transactions, no real ETH needed |
| **Backend** | Node.js + Express.js | Fast, non-blocking I/O, large npm ecosystem |
| **Database** | MongoDB (Mongoose ODM) | Flexible schema for metadata, good for JSON-like data |
| **Frontend** | React (Vite) | Component-based UI, fast hot-reload development |
| **Blockchain Library** | Ethers.js v6 | Connect JavaScript to Ethereum, send transactions |
| **Cryptography** | merkletreejs + keccak256 | Build Merkle trees for unit-level verification proofs |
| **Auth** | JWT (JSON Web Tokens) | Stateless authentication for API endpoints |
| **QR Codes** | qrcode (npm) | Generate scannable QR codes for medicines |

---

## 3. HOW BLOCKCHAIN IS USED (Simple Explanation)

### What is blockchain?
Think of it as a **shared notebook** that everyone can read but nobody can erase or edit. Once you write something in it, it stays forever. Every "page" (block) is linked to the previous one using math (cryptographic hashes), so changing any past entry would break the entire chain.

### What we store ON the blockchain:
```
Batch {
  batchId:          "BATCH-001"
  manufacturer:     0xAbC123... (wallet address)
  currentOwner:     0xDeF456... (who has it now)
  createdAt:        1714000000 (timestamp)
  expiryDate:       1745536000 (timestamp)
  dataHash:         0x7f3a... (hash of metadata — for integrity check)
  unitsMerkleRoot:  0x9c2b... (Merkle root — explained below)
  totalUnits:       1000
  isActive:         true
  transferCount:    2
}
```

### What we store OFF the blockchain (MongoDB):
- Medicine name, dosage, composition, side effects, description
- Individual unit records (serial numbers, statuses, scan counts)
- Packaging hierarchy (boxes, cartons)
- User accounts, scan logs, QR codes

### Why this split?

| | On-Chain (Blockchain) | Off-Chain (MongoDB) |
|---|---|---|
| **Cost** | Every write costs gas (money) | Free to read/write |
| **Speed** | ~2-15 seconds per write | Milliseconds |
| **Storage** | Expensive (~$0.01-0.10 per byte on mainnet) | Cheap (pennies per GB) |
| **Immutability** | Cannot be changed ever | Can be updated |
| **Trust** | No single party controls it | Controlled by server admin |

**Rule of thumb**: Store the **minimum critical data** on-chain (proof of existence, ownership, integrity hash). Store everything else off-chain.

### The `dataHash` — How we ensure off-chain data integrity

We hash the medicine metadata (name, dosage, composition, etc.) using `keccak256` and store the resulting hash on-chain. If anyone tampers with the MongoDB data, the hash won't match what's on the blockchain → **tampering detected**.

```
MongoDB Data:  { medicineName: "Amoxicillin", dosage: "500mg", ... }
     ↓ keccak256()
Hash:          0x7f3a5b2c... (stored on blockchain)
```

Later, anyone can re-hash the MongoDB data and compare it to the on-chain hash.

---

## 4. SMART CONTRACT — Deep Dive

The smart contract is written in **Solidity** and deployed on the Ethereum blockchain.

### What is a Smart Contract?
It's a **program that lives on the blockchain**. Once deployed, its rules cannot be changed. It automatically enforces business logic — no middleman needed.

### Our Contract's Structure:

**Roles (Enum)**:
```
None(0) → Admin(1) → Manufacturer(2) → Distributor(3) → Pharmacy(4) → Consumer(5)
```

**Key Functions**:

| Function | Who can call | What it does |
|---|---|---|
| `registerStakeholder()` | Admin only | Register a new user with a role |
| `createBatch()` | Manufacturer only | Create a new medicine batch |
| `transferBatch()` | Current owner | Transfer ownership to the next party |
| `deactivateBatch()` | Admin or Manufacturer | Recall/deactivate a batch |
| `verifyBatch()` | Anyone | Check if a batch is valid |
| `getBatchMerkleRoot()` | Anyone | Get the Merkle root for unit verification |

**Supply Chain Enforcement** — The contract enforces the correct order:
```
Manufacturer → Distributor → Pharmacy → Consumer
```
A manufacturer CANNOT transfer directly to a consumer. A pharmacy CANNOT transfer backwards to a distributor. The smart contract **rejects invalid transfers automatically**.

### How a Blockchain Transaction Works (Step by Step):

```
1. Manufacturer clicks "Create Batch" in the UI
2. Frontend sends API request to Backend
3. Backend prepares transaction data
4. Backend signs the transaction with the manufacturer's private key
5. Signed transaction is sent to the Hardhat blockchain node
6. The node validates the transaction (checks roles, expiry, etc.)
7. If valid: executes the smart contract function
8. Transaction is included in a new block
9. Block is added to the chain (permanent, immutable)
10. Backend receives the transaction receipt (hash, block number)
11. Backend stores metadata in MongoDB
12. Response sent back to Frontend
```

---

## 5. MERKLE TREES — The Key Innovation

### The Problem:
A batch has 10,000 units. We can't store 10,000 serial numbers on the blockchain (too expensive). But consumers need to verify their individual packet is genuine.

### The Solution: Merkle Tree

A Merkle tree is a **binary tree of hashes**. It lets you prove that one item belongs to a set, without revealing or storing the entire set.

```
                    ┌─────────────────┐
                    │   Merkle Root   │  ← Only THIS is stored on blockchain
                    │   0x9c2b...     │
                    └────────┬────────┘
                   ┌─────────┴─────────┐
              ┌────┴────┐         ┌────┴────┐
              │ Hash AB │         │ Hash CD │
              └────┬────┘         └────┬────┘
           ┌───────┴───────┐   ┌───────┴───────┐
        ┌──┴──┐         ┌──┴──┐  ┌──┴──┐     ┌──┴──┐
        │ H(A)│         │ H(B)│  │ H(C)│     │ H(D)│
        └──┬──┘         └──┬──┘  └──┬──┘     └──┬──┘
           │               │        │            │
        Unit A          Unit B   Unit C       Unit D
   "BATCH-001-U-001" "BATCH-001-U-002" ...
```

### How Verification Works:

To prove Unit B belongs to this batch, you only need:
1. The serial number of Unit B
2. The **Merkle proof**: `[H(A), Hash_CD]` (just 2 hashes, not all 10,000)
3. The **Merkle root** from the blockchain

The verifier re-computes: `H(B)` → combine with `H(A)` → get `Hash_AB` → combine with `Hash_CD` → should equal the Merkle root on-chain.

**Result**: Verify 1 unit out of 10,000 by storing only 1 hash (32 bytes) on-chain. The proof is just ~13 hashes (log₂(10000) ≈ 13).

### In our code:
```javascript
// Building the tree (during batch creation):
const leaves = serialNumbers.map(sn => keccak256(sn));
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getHexRoot(); // → stored on blockchain

// Verifying a unit (during consumer scan):
const leaf = keccak256(serialNumber);
const isValid = tree.verify(proof, leaf, onChainRoot); // true/false
```

---

## 6. HIERARCHICAL PACKAGING (Cascade System)

### The Problem:
A distributor receives 10,000 units. They can't scan each one individually.

### The Solution: 3-Level Hierarchy
```
Carton (e.g., BATCH-001-C-01)
  └── Box (e.g., BATCH-001-B-001)  ← 20 boxes per carton
        └── Unit (e.g., BATCH-001-U-00001)  ← 50 units per box
```

### Cascade Scanning:
- **Distributor scans 1 carton** → System updates all 20 boxes + all 1000 units inside → Status: `"in-transit"`
- **Pharmacy scans 1 box** → System updates all 50 units inside → Status: `"at-pharmacy"`
- **Consumer scans 1 unit** → System verifies that specific packet

**This reduces 10,000 manual scans to just 1 scan at the carton level.**

---

## 7. SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│  Pages: Login, Dashboard (per role), Verify Medicine             │
│  Components: QRScanner, BatchCard, SupplyChainTimeline           │
│  Runs on: http://localhost:5173                                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP API calls (Axios)
┌──────────────────────▼───────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                   │
│  Routes: /auth, /batch, /verify, /unit, /admin                   │
│  Services: blockchainService, unitService, anomalyService, qrService │
│  Middleware: JWT auth, role-based access control                  │
│  Runs on: http://localhost:5000                                   │
└───────────┬───────────────────────────────┬──────────────────────┘
            │                               │
  ┌─────────▼─────────┐          ┌──────────▼──────────┐
  │   MongoDB Atlas    │          │  Hardhat Blockchain  │
  │                    │          │                      │
  │ • Users            │          │ • Smart Contract     │
  │ • BatchMetadata    │          │ • Batch records      │
  │ • UnitRecords      │          │ • Transfer history   │
  │ • PackagingLevels  │          │ • Merkle roots       │
  │ • ScanLogs         │          │ • Stakeholder roles  │
  └────────────────────┘          └──────────────────────┘
```

---

## 8. AUTHENTICATION & SECURITY

### JWT Authentication Flow:
```
1. User sends username + password to POST /api/auth/login
2. Server verifies password (bcrypt hash comparison)
3. If valid → Server creates a JWT token containing { userId, role }
4. Token sent back to frontend, stored in localStorage
5. Every subsequent API call includes: Authorization: Bearer <token>
6. Auth middleware decodes token → attaches user to request
```

### Role-Based Access Control (RBAC):
```javascript
// Middleware checks: is user's role in the allowed list?
roleCheck("manufacturer")          // Only manufacturers
roleCheck("distributor", "pharmacy") // Either distributors or pharmacies
// No roleCheck = any authenticated user
// No auth middleware = public endpoint (like consumer verification)
```

### Security Layers:
| Layer | Mechanism |
|---|---|
| Passwords | bcrypt hashing (12 salt rounds) |
| API Auth | JWT tokens with expiry |
| Blockchain | Private key signing for transactions |
| Data Integrity | keccak256 hash of metadata stored on-chain |
| Unit Authenticity | Merkle proof verification against on-chain root |
| Anti-counterfeit | Anomaly detection (scan frequency, location, IP analysis) |

---

## 9. ANOMALY DETECTION

The system automatically flags suspicious activity:

| Check | Threshold | Example |
|---|---|---|
| Scan frequency | >10 scans/hour for same batch | Someone scanning a cloned QR code repeatedly |
| Multi-location | >3 locations/hour for same batch | Same batch appearing in Mumbai and Delhi simultaneously |
| Rapid scans | <5 seconds between scans | Automated scanning bot |
| Multiple IPs | ≥5 unique IPs for same batch | QR code image shared online |
| Unit re-scan | Already dispensed | Someone trying to verify a cloned packet |

---

## 10. COMPLETE DATA FLOW (End-to-End)

### Flow 1: Batch Creation
```
Manufacturer Dashboard → fills form (medicine name, quantity, expiry, units/box, boxes/carton)
  → POST /api/batch/create
  → unitService.generateUnitsForBatch():
      1. Creates serial numbers: BATCH-001-U-00001 to BATCH-001-U-01000
      2. Creates packaging: 20 boxes, 1 carton
      3. Builds Merkle tree from all 1000 serial numbers
      4. Stores Merkle proof with each unit in MongoDB
  → blockchainService.createBatchOnChain():
      1. Signs transaction with manufacturer's private key
      2. Calls smart contract: createBatch(batchId, dataHash, expiry, merkleRoot, 1000)
      3. Transaction mined → returns txHash
  → Stores metadata in MongoDB (BatchMetadata collection)
  → Generates batch QR code
  → Returns success response
```

### Flow 2: Supply Chain Transfer
```
Manufacturer → Transfer to Distributor:
  → POST /api/batch/transfer { batchId, newOwnerAddress }
  → Smart contract: transferBatch(batchId, distributorAddress)
  → Contract validates: Manufacturer→Distributor ✅
  → Ownership updated on-chain
  → Status updated in MongoDB: "in-transit"

Distributor → scans carton QR:
  → POST /api/unit/scan-packaging { levelId: "BATCH-001-C-01" }
  → Cascade: 1 carton → 20 boxes → 1000 units → all set to "in-transit"
```

### Flow 3: Consumer Verification
```
Consumer scans unit QR code: BATCH-001-U-00042
  → GET /api/unit/verify/BATCH-001-U-00042
  → Step 1: Find unit in MongoDB → EXISTS ✅
  → Step 2: Check status → NOT "dispensed" ✅ (first scan)
  → Step 3: Fetch Merkle root from blockchain → 0x9c2b...
  → Step 4: Verify Merkle proof → tree.verify(proof, leaf, root) → TRUE ✅
  → Step 5: Check anomalies → scan count < 5 ✅
  → Step 6: Mark as "dispensed", increment scan count, save
  → Return: { status: "valid", isAuthentic: true, merkleProofValid: true }
```

---
