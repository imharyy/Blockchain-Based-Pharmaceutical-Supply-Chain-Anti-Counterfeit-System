# PharmaChain — Project Documentation

> **Blockchain-Based Pharmaceutical Supply Chain & Anti-Counterfeit System**

A full-stack decentralized application (DApp) that tracks pharmaceutical products from manufacturer to consumer using Ethereum smart contracts, a Node.js backend, and a React frontend. The system provides end-to-end supply chain visibility, QR-code-based medicine verification, and anomaly detection to combat counterfeit drugs.

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Technologies Used](#2-technologies-used)
3. [System Architecture](#3-system-architecture)
4. [Project Structure](#4-project-structure)
5. [Setup & Installation](#5-setup--installation)
6. [Smart Contract Layer](#6-smart-contract-layer)
7. [Backend Layer](#7-backend-layer)
8. [Frontend Layer](#8-frontend-layer)
9. [Data Flow](#9-data-flow)
10. [Role-Based Access Control](#10-role-based-access-control)
11. [Key Features In Detail](#11-key-features-in-detail)
12. [API Reference](#12-api-reference)
13. [Testing](#13-testing)
14. [Environment Variables](#14-environment-variables)

---

## 1. Overview & Goals

### Problem
Counterfeit pharmaceuticals are a global health crisis. Consumers have no reliable way to verify whether a medicine they purchased is genuine, and supply chain participants lack transparency about a product's journey.

### Solution
PharmaChain solves this by:
- **Recording every supply chain event on an Ethereum blockchain** — making records immutable and tamper-proof.
- **Generating QR codes** for each medicine batch that consumers can scan to instantly verify authenticity.
- **Running anomaly detection** to flag suspicious scanning patterns that may indicate counterfeit activity.
- **Providing role-specific dashboards** for every participant in the supply chain (Admin, Manufacturer, Distributor, Pharmacy, Consumer).

### Supply Chain Flow
```
Manufacturer  →  Distributor  →  Pharmacy  →  Consumer
   (creates)     (transports)    (stocks)     (verifies)
```

---

## 2. Technologies Used

### Blockchain Layer
| Technology | Purpose |
|---|---|
| **Solidity ^0.8.19** | Smart contract programming language |
| **Hardhat** | Ethereum development environment (compile, deploy, test) |
| **Ethers.js v6** | JavaScript library for interacting with the Ethereum blockchain |
| **Hardhat Toolbox** | Plugin bundle (testing with Chai, coverage, gas reports) |

### Backend Layer
| Technology | Purpose |
|---|---|
| **Node.js** | Server runtime |
| **Express.js** | REST API framework |
| **MongoDB (via Mongoose)** | Off-chain database for metadata, users, and scan logs |
| **JSON Web Tokens (JWT)** | Authentication & session management |
| **bcrypt.js** | Password hashing |
| **qrcode** | QR code generation for medicine batches |

### Frontend Layer
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **html5-qrcode** | Camera-based QR code scanning |
| **react-hot-toast** | Toast notification system |
| **Ethers.js v6** | Direct blockchain reads from the browser |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│   Browser at http://localhost:5173                                  │
│                                                                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Login /  │  │ Role-Based │  │   Verify     │  │   QR Code    │ │
│  │ Register  │  │ Dashboards │  │   Medicine   │  │   Scanner    │ │
│  └─────┬─────┘  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘ │
│        │              │               │                │           │
│        ▼              ▼               ▼                ▼           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    services/api.js (Axios)                    │  │
│  │                    services/blockchain.js (Ethers.js)         │  │
│  └───────────────────────┬──────────────────┬───────────────────┘  │
└──────────────────────────┼──────────────────┼──────────────────────┘
                           │ HTTP REST        │ JSON-RPC
                           ▼                  ▼
┌──────────────────────────────────┐  ┌───────────────────────────────┐
│     BACKEND (Node + Express)     │  │  ETHEREUM BLOCKCHAIN          │
│   http://localhost:5000/api      │  │  (Hardhat Local Node)         │
│                                  │  │  http://127.0.0.1:8545        │
│  ┌─────────-──┐ ┌──────────────┐  │  │                               │
│  │  Routes    │ │  Middleware  │ │ │  ┌─────────────────────────┐ │
│  │  (auth,    │ │  (auth JWT,  │  │  │  │ PharmSupplyChain.sol    │ │
│  │   batch,   │ │   roleCheck) │  │  │  │                         │ │
│  │   verify,  │ └──────────────┘  │  │  │ • Stakeholder registry  │ │
│  │   admin)   │                   │  │  │ • Batch management      │ │
│  └─────┬──────┘                   │  │  │ • Transfer tracking     │ │
│        │                          │  │  │ • Verification          │ │
│        ▼                          │  │  └─────────────────────────┘ │
│  ┌──────────────────────────────┐ │  └───────────────────────────────┘
│  │  Services                    │ │
│  │  • blockchainService.js ─────────▶ (Reads/Writes to smart contract)
│  │  • anomalyService.js        │ │
│  │  • qrService.js             │ │
│  └─────┬────────────────────────┘ │
│        ▼                          │
│  ┌──────────────────────────────┐ │
│  │  MongoDB Atlas               │ │
│  │  • Users collection          │ │
│  │  • BatchMetadata collection  │ │
│  │  • ScanLogs collection       │ │
│  └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Why Two Data Stores?

| Data Store | What is stored | Why |
|---|---|---|
| **Blockchain (Ethereum)** | Batch ID, manufacturer address, current owner, transfer history, data integrity hash, expiry date | Immutability, tamper-proof, public verifiability |
| **MongoDB** | User credentials, medicine details (name, dosage, composition, side effects), QR codes, scan logs | Cost efficiency (storing large text on-chain is expensive), queryability, performance |

The two stores are linked by the **batch ID** and a **keccak256 data hash** — the hash of the off-chain metadata is stored on-chain so anyone can verify the off-chain data hasn't been tampered with.

---

## 4. Project Structure

```
blockchain project/
│
├── contracts/                        # Solidity smart contracts
│   └── PharmSupplyChain.sol          # Main contract (283 lines)
│
├── scripts/                          # Deployment scripts
│   └── deploy.js                     # Deploys contract + registers sample stakeholders
│
├── test/                             # Smart contract tests
│   └── PharmSupplyChain.test.js      # 16 test cases (Chai + Hardhat)
│
├── artifacts/                        # Compiled contract ABIs (auto-generated by Hardhat)
│   └── contracts/PharmSupplyChain.sol/
│       └── PharmSupplyChain.json     # ABI used by backend
│
├── cache/                            # Hardhat build cache (auto-generated)
│
├── backend/                          # Node.js + Express REST API
│   ├── server.js                     # App entry point, middleware setup, route mounting
│   ├── config/
│   │   ├── db.js                     # MongoDB connection via Mongoose
│   │   └── blockchain.js             # Ethers.js provider & contract initialization
│   ├── middleware/
│   │   ├── auth.js                   # JWT token verification middleware
│   │   └── roleCheck.js              # Role-based access control middleware
│   ├── models/
│   │   ├── User.js                   # User schema (credentials, role, wallet)
│   │   ├── BatchMetadata.js          # Off-chain batch metadata schema
│   │   └── ScanLog.js                # Verification scan log schema
│   ├── routes/
│   │   ├── auth.js                   # Register, login, profile endpoints
│   │   ├── batch.js                  # Batch CRUD + transfer endpoints
│   │   ├── verify.js                 # Verification & scan logging endpoints
│   │   └── admin.js                  # Admin dashboard & stakeholder management
│   ├── services/
│   │   ├── blockchainService.js      # Smart contract interaction wrapper
│   │   ├── anomalyService.js         # Suspicious activity detection engine
│   │   └── qrService.js              # QR code generation service
│   ├── .env                          # Backend environment variables
│   └── package.json                  # Backend dependencies
│
├── frontend/                         # React + Vite SPA
│   ├── index.html                    # HTML entry point
│   ├── vite.config.js                # Vite configuration
│   ├── .env                          # Frontend environment variables (VITE_ prefixed)
│   ├── src/
│   │   ├── main.jsx                  # React bootstrap & root render
│   │   ├── App.jsx                   # Router setup, route guards, toast config
│   │   ├── index.css                 # Complete design system (25KB, all styles)
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global auth state (login, register, logout)
│   │   ├── services/
│   │   │   ├── api.js                # Axios instance with auth interceptors
│   │   │   └── blockchain.js         # Direct blockchain reads from browser
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Navigation bar with role-based links
│   │   │   ├── BatchCard.jsx         # Reusable batch display card
│   │   │   ├── QRScanner.jsx         # Camera + text QR scanner
│   │   │   ├── SupplyChainTimeline.jsx # Visual transfer history timeline
│   │   │   └── TransferForm.jsx      # Modal form for batch transfers
│   │   └── pages/
│   │       ├── Login.jsx             # Login page
│   │       ├── Register.jsx          # Registration page
│   │       ├── Dashboard.jsx         # Role-based dashboard router
│   │       ├── AdminDashboard.jsx    # Admin: stats, users, scan activity
│   │       ├── ManufacturerDashboard.jsx # Create batches, view QR, transfer
│   │       ├── DistributorDashboard.jsx  # View & forward batches
│   │       ├── PharmacyDashboard.jsx     # Inventory & dispense to consumers
│   │       ├── ConsumerDashboard.jsx     # QR scanner for consumers
│   │       └── VerifyMedicine.jsx        # Public verification results page
│   └── package.json                  # Frontend dependencies
│
├── hardhat.config.js                 # Hardhat network & compiler configuration
├── deployment.json                   # Deployed contract addresses (auto-generated)
├── package.json                      # Root (Hardhat) dependencies & scripts
├── .env.example                      # Template for environment variables
└── DOCUMENTATION.md                  # ← This file
```

---

## 5. Setup & Installation

### Prerequisites
- **Node.js** v18 or later
- **npm** (comes with Node.js)
- **MongoDB Atlas** account (free tier works) or local MongoDB instance
- A modern web browser

### Step-by-Step

#### 1. Install root dependencies (Hardhat)
```bash
cd "blockchain project"
npm install
```

#### 2. Start the local Ethereum blockchain
```bash
npx hardhat node
```
This starts a local Hardhat network at `http://127.0.0.1:8545` with 20 pre-funded test accounts. **Keep this terminal open.**

#### 3. Compile & deploy the smart contract
```bash
# In a new terminal
npx hardhat compile
npm run deploy
```
This compiles `PharmSupplyChain.sol`, deploys it to the local network, registers sample stakeholders (manufacturer, distributor, pharmacy, consumer), and writes the contract address to `deployment.json`.

#### 4. Set up the backend
```bash
cd backend
npm install
```
Create or update `backend/.env` with:
```env
MONGODB_URI=mongodb+srv://<your-connection-string>
JWT_SECRET=your-secret-key
PORT=5000
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<address from deployment.json>
ADMIN_PRIVATE_KEY=<hardhat account 0 private key>
```
Start the backend:
```bash
npm run dev
```

#### 5. Set up the frontend
```bash
cd frontend
npm install
```
Create or update `frontend/.env` with:
```env
VITE_API_URL=http://localhost:5000/api
VITE_CONTRACT_ADDRESS=<address from deployment.json>
VITE_RPC_URL=http://127.0.0.1:8545
```
Start the frontend:
```bash
npm run dev
```

#### 6. Open the app
Navigate to `http://localhost:5173` in your browser.

---

## 6. Smart Contract Layer

### File: `contracts/PharmSupplyChain.sol`

This is the core on-chain logic. It is a single Solidity contract deployed to Ethereum.

#### Roles (Enum)
```
None (0) | Admin (1) | Manufacturer (2) | Distributor (3) | Pharmacy (4) | Consumer (5)
```

#### Data Structures

| Struct | Fields | Purpose |
|---|---|---|
| `Stakeholder` | address, role, isRegistered, name | Represents a registered participant |
| `Batch` | batchId, manufacturer, currentOwner, createdAt, expiryDate, dataHash, isActive, transferCount | Represents a medicine batch |
| `TransferRecord` | from, to, timestamp, fromRole, toRole | A single ownership transfer event |

#### Key Functions

| Function | Who Can Call | What It Does |
|---|---|---|
| `registerStakeholder()` | Admin only | Registers a new participant with a specific role |
| `createBatch()` | Manufacturer only | Creates a new medicine batch on-chain |
| `transferBatch()` | Current batch owner | Transfers ownership following the supply chain order |
| `deactivateBatch()` | Admin or original manufacturer | Deactivates a batch (e.g., for recalls) |
| `verifyBatch()` | Anyone (view) | Returns validity, manufacturer, owner, expiry status |
| `getBatchHistory()` | Anyone (view) | Returns the full transfer history of a batch |
| `_isValidTransfer()` | Internal | Enforces: Manufacturer→Distributor→Pharmacy→Consumer |

#### Events (emitted for frontend/backend to listen to)
- `StakeholderRegistered`
- `BatchCreated`
- `BatchTransferred`
- `BatchDeactivated`

#### Modifiers (access control)
- `onlyAdmin` — only the admin can call
- `onlyRegistered` — only registered stakeholders
- `onlyBatchOwner` — only the current owner of a specific batch
- `batchExists` — the batch must be active

---

## 7. Backend Layer

### Entry Point: `backend/server.js`

The Express server initializes in this order:
1. **Load environment variables** from `.env`
2. **Configure middleware** — CORS, JSON parsing, request logging
3. **Mount route handlers** at `/api/auth`, `/api/batch`, `/api/verify`, `/api/admin`
4. **Connect to MongoDB** via `config/db.js`
5. **Initialize blockchain** connection via `config/blockchain.js`
6. **Start listening** on port 5000

### Configuration (`backend/config/`)

#### `db.js` — MongoDB Connection
- Uses Mongoose to connect to MongoDB Atlas
- Connection string is read from `MONGODB_URI` environment variable
- Exits the process on connection failure

#### `blockchain.js` — Blockchain Connection
- Creates an Ethers.js `JsonRpcProvider` connected to the Hardhat node
- Loads the compiled contract ABI from `artifacts/contracts/PharmSupplyChain.sol/PharmSupplyChain.json`
- Creates a contract instance signed with the admin's private key (for server-side transactions like registering stakeholders)
- Exports helper functions: `getContract()`, `getProvider()`, `getAdminWallet()`, `getContractWithSigner()`

### Middleware (`backend/middleware/`)

#### `auth.js` — JWT Authentication
- Extracts the Bearer token from the `Authorization` header
- Verifies the token using the `JWT_SECRET`
- Looks up the user in MongoDB and attaches it to `req.user`
- Returns 401 for missing/invalid/expired tokens

#### `roleCheck.js` — Role-Based Authorization
- Takes a list of allowed roles as arguments (e.g., `roleCheck("manufacturer", "admin")`)
- Checks if `req.user.role` is in the allowed list
- Returns 403 if the user's role doesn't match

### Models (`backend/models/`)

#### `User.js`
| Field | Type | Notes |
|---|---|---|
| username | String | Unique, required |
| email | String | Unique, required |
| password | String | Hashed with bcrypt (12 rounds) before saving |
| role | String (enum) | admin, manufacturer, distributor, pharmacy, consumer |
| walletAddress | String | Unique Ethereum address |
| privateKey | String | Excluded from queries by default (`select: false`) — demo only |
| organizationName | String | Company or pharmacy name |
| isActive | Boolean | For account deactivation |
| isBlockchainRegistered | Boolean | Whether registered on-chain |

#### `BatchMetadata.js`
| Field | Type | Notes |
|---|---|---|
| batchId | String | Unique identifier, links to on-chain data |
| medicineName | String | Human-readable name |
| description, dosage, composition, sideEffects | String | Detailed medicine info |
| manufacturerName, manufacturerAddress | String | Who created the batch |
| manufactureDate, expiryDate | Date | Production and expiry dates |
| quantity, unit | Number, String | e.g., 500 tablets |
| qrCodeData | String | Base64-encoded QR code image |
| dataHash | String | keccak256 hash stored on-chain for integrity |
| status | String (enum) | created, in-transit, delivered, with-consumer, recalled |

#### `ScanLog.js`
| Field | Type | Notes |
|---|---|---|
| batchId | String | Which batch was scanned |
| scannedBy | String | Wallet address or user ID |
| scannerRole | String | Role of the scanner |
| location | String | Location of scan |
| ipAddress, userAgent | String | Network details for anomaly detection |
| flagged | Boolean | Whether anomaly was detected |
| flagReason | String | Explanation of why it was flagged |
| verificationResult | String (enum) | valid, invalid, suspicious, expired |

### Routes (`backend/routes/`)

#### `auth.js` — Authentication Routes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a new user (off-chain + optionally on-chain) |
| POST | `/api/auth/login` | No | Authenticate and receive a JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |
| GET | `/api/auth/users` | Admin | List all users |

#### `batch.js` — Batch Management Routes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/batch/create` | Manufacturer | Create a new batch (on-chain + off-chain + QR) |
| POST | `/api/batch/transfer` | Mfr/Dist/Pharm | Transfer batch ownership |
| GET | `/api/batch` | Yes | List all batches (role-filtered) |
| GET | `/api/batch/:batchId` | No | Get batch details (combined on-chain + off-chain) |
| GET | `/api/batch/:batchId/history` | No | Get transfer history |
| GET | `/api/batch/:batchId/qr` | No | Get QR code image |

#### `verify.js` — Verification Routes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/verify/scan` | No | Log a scan, run anomaly detection, verify on-chain |
| GET | `/api/verify/:batchId` | No | Quick verification without scan logging |
| GET | `/api/verify/:batchId/scans` | No | Get scan history for a batch |

#### `admin.js` — Admin Routes
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | System stats (users, batches, scans, flagged) |
| POST | `/api/admin/register-stakeholder` | Admin | Register a user on the blockchain |
| GET | `/api/admin/stakeholders` | Admin | List all stakeholders |

### Services (`backend/services/`)

#### `blockchainService.js` — Smart Contract Wrapper
Abstracts all smart contract interactions into clean async functions:
- `registerStakeholderOnChain(address, role, name)` — Admin registers a user on-chain
- `createBatchOnChain(batchId, dataHash, expiryTimestamp, signerPrivateKey)` — Creates batch
- `transferBatchOnChain(batchId, newOwnerAddress, signerPrivateKey)` — Transfers batch
- `getBatchFromChain(batchId)` — Reads batch data
- `getBatchHistoryFromChain(batchId)` — Reads transfer history
- `verifyBatchOnChain(batchId)` — Verifies batch authenticity
- `generateDataHash(metadata)` — Creates keccak256 hash of off-chain data

Also contains `ROLE_MAP` (string→enum) and `ROLE_NAMES` (enum→string) for role conversions.

#### `anomalyService.js` — Counterfeit Detection Engine
Analyzes QR scan patterns to detect suspicious activity:

| Check | Threshold | What It Detects |
|---|---|---|
| Scan frequency | >10 scans/hour | Same batch scanned excessively |
| Multi-location | >3 locations/hour | Same batch appearing in multiple places |
| Rapid scans | <5 seconds apart | Bot-like scanning behavior |
| Multiple IPs | >5 unique IPs | Distributed counterfeit rings |

Returns `{ isSuspicious: boolean, reasons: string[] }`.

Also provides `getBatchAnomalyStats()` for dashboard-level statistics.

#### `qrService.js` — QR Code Generator
- `generateQRCode(batchId)` — Returns a Base64-encoded QR code data URL
- The QR encodes a verification URL: `http://localhost:5173/verify/{batchId}`
- Uses high error correction (level H) for reliable scanning
- `generateQRBuffer(batchId)` — Returns raw PNG buffer for file export

---

## 8. Frontend Layer

### Entry Point Flow
```
index.html  →  main.jsx  →  App.jsx  →  Routes
```

### `main.jsx`
Bootstraps the React application, imports the global `index.css` stylesheet, and renders `<App />` inside `React.StrictMode`.

### `App.jsx` — Routing & Guards
Sets up:
- **`BrowserRouter`** — HTML5 history routing
- **`AuthProvider`** — Wraps the entire app with auth context
- **`Toaster`** — Toast notification container (dark theme)
- **`ProtectedRoute`** — Redirects unauthenticated users to `/login`, shows `<Navbar>` for authenticated users
- **`PublicRoute`** — Redirects authenticated users to `/dashboard`

#### Route Map
| Path | Component | Auth Required |
|---|---|---|
| `/login` | Login | No (redirects if logged in) |
| `/register` | Register | No (redirects if logged in) |
| `/verify` | VerifyMedicine | No |
| `/verify/:batchId` | VerifyMedicine | No |
| `/dashboard` | Dashboard (role-based) | Yes |
| `/` | Redirects to `/dashboard` | — |

### Context (`frontend/src/context/`)

#### `AuthContext.jsx`
Global authentication state management using React Context:
- **State**: `user`, `token`, `loading`
- **`login(email, password)`** — Calls `/api/auth/login`, stores JWT in localStorage, updates state
- **`register(data)`** — Calls `/api/auth/register`, stores JWT, updates state
- **`logout()`** — Clears localStorage and resets state
- **Auto-restore**: On mount, if a token exists in localStorage, fetches the user profile from `/api/auth/me`

### Services (`frontend/src/services/`)

#### `api.js`
An Axios instance pre-configured with:
- Base URL: `http://localhost:5000/api`
- Auto-attaches JWT from localStorage to every request
- Response interceptor: on 401 errors, clears auth data and redirects to `/login`

#### `blockchain.js`
Direct Ethereum blockchain reads from the browser (no backend needed):
- `initBlockchain()` — Connects to the Hardhat node and creates a contract instance
- `verifyBatchOnChain(batchId)` — Reads batch verification data
- `getBatchHistoryOnChain(batchId)` — Reads transfer history
- Helper utilities: `getRoleName()`, `formatAddress()`, `formatTimestamp()`

Uses a minimal ABI (only the view functions needed by the frontend) instead of the full compiled artifact.

### Components (`frontend/src/components/`)

#### `Navbar.jsx`
- Displays the PharmaChain brand logo
- Shows role-specific navigation links (e.g., manufacturers see "New Batch", consumers see "Verify Medicine")
- Shows user info (name, role, avatar) and a logout button

#### `BatchCard.jsx`
A reusable card component displaying:
- Batch ID, medicine name, manufacturer, expiry date, quantity
- Status badge with color coding (created=blue, in-transit=cyan, delivered=green, recalled=red)
- Action buttons: "View Details" (shows QR), "Transfer" (opens transfer modal)

#### `QRScanner.jsx`
Dual-mode input component:
- **Camera mode**: Uses `html5-qrcode` to access the device camera and scan QR codes in real-time
- **Text mode**: Manual batch ID entry form
- Automatically extracts the batch ID from QR-encoded verification URLs

#### `SupplyChainTimeline.jsx`
A visual timeline showing the complete journey of a medicine batch:
- Origin point (manufacturer creation)
- Each transfer with from/to addresses, roles, and timestamps
- Current location marker
- Color-coded by role (purple=manufacturer, cyan=distributor, green=pharmacy, yellow=consumer)

#### `TransferForm.jsx`
A modal dialog for transferring batch ownership:
- Input field for recipient wallet address
- Submits to `/api/batch/transfer`
- Shows loading state during blockchain transaction

### Pages (`frontend/src/pages/`)

#### `Login.jsx`
Simple login form (email + password) with:
- Form validation
- Toast notifications for success/error
- Link to registration page

#### `Register.jsx`
Registration form with fields for:
- Username, email, password
- Role selection dropdown (manufacturer, distributor, pharmacy, consumer)
- Organization name
- Wallet address and private key (for demo/development purposes)

#### `Dashboard.jsx`
A router component that renders the correct dashboard based on the user's role:
```
user.role === "admin"         →  AdminDashboard
user.role === "manufacturer"  →  ManufacturerDashboard
user.role === "distributor"   →  DistributorDashboard
user.role === "pharmacy"      →  PharmacyDashboard
user.role === "consumer"      →  ConsumerDashboard
```

#### `AdminDashboard.jsx`
- **Stats grid**: Total users, total batches, total scans, flagged scans
- **Stakeholders table**: All registered users with roles, wallet addresses, and blockchain registration status
- **Action**: Register unregistered users on the blockchain with a button click
- **Recent scan activity**: Table of latest verification scans with results

#### `ManufacturerDashboard.jsx`
- **Create batch form**: Expandable form with fields for batch ID, medicine name, description, dosage, composition, side effects, expiry date, quantity, and unit
- **Stats**: Total batches, created, in-transit, delivered counts
- **Batch grid**: All manufacturer's batches as cards with QR view and transfer actions

#### `DistributorDashboard.jsx`
- **Stats**: Total batches, in-transit, delivered counts
- **Batch grid**: Batches with transfer capability (to forward to pharmacies)

#### `PharmacyDashboard.jsx`
- **Stats**: Inventory count, delivered, dispensed counts
- **Batch grid**: Batches with transfer capability (to dispense to consumers)

#### `ConsumerDashboard.jsx`
- **QR Scanner**: Central scanner for verifying medicines
- **Info cards**: Explains the verification process (Scan → Blockchain Verified → Anti-Counterfeit)

#### `VerifyMedicine.jsx`
The main verification results page. This is the most feature-rich page:
1. **Scanner**: QR camera or text input (shown when no batch is selected)
2. **Status banner**: Color-coded result — ✅ Authentic (green), ⏰ Expired (amber), ⚠️ Suspicious (orange), 🚫 Counterfeit (red)
3. **Anomaly warnings**: Detailed list of flagged reasons if suspicious
4. **Medicine info**: Name, manufacturer, dosage, composition, expiry, quantity, description, side effects
5. **Blockchain verification**: Manufacturer address, current owner, transfer count, scan count
6. **Supply chain timeline**: Visual journey from creation to current holder

---

## 9. Data Flow

### Flow 1: Creating a Medicine Batch

```
Manufacturer fills form in ManufacturerDashboard
       │
       ▼
Frontend sends POST /api/batch/create
       │
       ▼
Backend (batch.js route handler):
  1. Validates input fields
  2. Checks for duplicate batch ID in MongoDB
  3. Retrieves manufacturer's private key from MongoDB
  4. Generates keccak256 hash of metadata → dataHash
  5. Calls createBatchOnChain(batchId, dataHash, expiryDate, privateKey)
     │
     ├──▶ Blockchain: createBatch() stores batchId, dataHash, expiryDate, manufacturer
     │    Returns: transaction hash
     │
  6. Generates QR code (encodes verification URL)
  7. Saves full metadata to MongoDB (BatchMetadata collection)
  8. Returns success + batch data + blockchain transaction info
```

### Flow 2: Transferring a Batch

```
Current owner clicks "Transfer" on a BatchCard
       │
       ▼
TransferForm modal → user enters recipient wallet address
       │
       ▼
Frontend sends POST /api/batch/transfer
       │
       ▼
Backend (batch.js route handler):
  1. Retrieves sender's private key from MongoDB
  2. Calls transferBatchOnChain(batchId, newOwner, senderPrivateKey)
     │
     ├──▶ Blockchain: transferBatch() checks:
     │       - Sender is current owner  ✓
     │       - Recipient is registered   ✓
     │       - Transfer follows supply chain order  ✓
     │           (Manufacturer→Distributor→Pharmacy→Consumer)
     │    Records TransferRecord, updates currentOwner
     │
  3. Updates batch status in MongoDB (in-transit / delivered / with-consumer)
  4. Returns success
```

### Flow 3: Verifying a Medicine (Consumer Scan)

```
Consumer scans QR code or enters batch ID
       │
       ▼
Frontend navigates to /verify/{batchId}
       │
       ▼
VerifyMedicine sends POST /api/verify/scan
       │
       ▼
Backend (verify.js route handler):
  1. Runs anomalyService.analyzeScan()
     │    - Checks scan frequency (>10/hour?)
     │    - Checks multi-location scanning (>3 locations/hour?)
     │    - Checks rapid scanning (<5 seconds apart?)
     │    - Checks multiple IP addresses (>5 unique IPs?)
     │    → Returns { isSuspicious, reasons[] }
     │
  2. Calls verifyBatchOnChain(batchId)
     │    → Returns { isValid, manufacturer, currentOwner, expiryDate, isExpired }
     │
  3. Calls getBatchHistoryFromChain(batchId)
     │    → Returns array of TransferRecords
     │
  4. Fetches BatchMetadata from MongoDB
     │
  5. Determines final verdict:
     │    - Not found on chain AND not in DB → "invalid" (counterfeit)
     │    - Found but expired → "expired"
     │    - Found but anomaly detected → "suspicious"
     │    - Found and clean → "valid" (authentic)
     │
  6. Creates ScanLog entry in MongoDB
  7. Returns combined result to frontend
       │
       ▼
VerifyMedicine renders:
  - Status banner (valid/expired/suspicious/invalid)
  - Anomaly warnings (if any)
  - Medicine information card
  - Blockchain verification details
  - Supply chain timeline visualization
```

---

## 10. Role-Based Access Control

### How It Works

Access control is enforced at **three levels**:

| Level | Mechanism | Where |
|---|---|---|
| **Smart Contract** | Solidity `modifier`s (`onlyAdmin`, `onlyRegistered`, `onlyBatchOwner`) | Blockchain |
| **Backend API** | `auth` middleware (JWT) + `roleCheck` middleware | Express routes |
| **Frontend UI** | `ProtectedRoute` component + role-based dashboard rendering | React |

### Permissions Matrix

| Action | Admin | Manufacturer | Distributor | Pharmacy | Consumer | Public |
|---|---|---|---|---|---|---|
| Register stakeholder on blockchain | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View admin dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create medicine batch | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer to distributor | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer to pharmacy | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Transfer to consumer | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Verify medicine | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View batch details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deactivate batch | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |

*Only the original manufacturer of that batch.

---

## 11. Key Features In Detail

### QR Code System
1. When a manufacturer creates a batch, the backend generates a QR code encoding the URL `http://localhost:5173/verify/{batchId}`
2. The QR is stored as a Base64 data URL in MongoDB
3. The manufacturer can view/print the QR from their dashboard
4. Consumers scan the QR with their phone camera — the QRScanner component decodes the URL, extracts the batch ID, and navigates to the verification page

### Anomaly Detection
The system tracks every verification scan in the `ScanLog` collection. Before recording each new scan, it analyzes recent patterns:

- **>10 scans of the same batch in one hour** → likely being scanned by multiple fakes bearing the same code
- **Same batch scanned from >3 different locations in one hour** → physically impossible for a single product
- **Scans <5 seconds apart** → bot or automated counterfeit verification
- **>5 unique IP addresses scanning one batch** → distributed counterfeit ring

If any threshold is breached, the scan is flagged as "suspicious" and the reasons are displayed to the user.

### Data Integrity Hash
When a batch is created:
1. Off-chain metadata (medicine name, dosage, composition, manufacturer, expiry) is JSON-stringified
2. A `keccak256` hash is computed
3. The hash is stored on-chain in the `Batch.dataHash` field
4. Anyone can later re-hash the off-chain data and compare with the on-chain hash to verify the data hasn't been tampered with

### Supply Chain Enforcement
The smart contract's `_isValidTransfer()` function enforces a strict linear flow:
```
Manufacturer → Distributor → Pharmacy → Consumer
```
Any attempt to skip a step (e.g., manufacturer directly to consumer) is rejected by the contract. This ensures every batch passes through the proper chain of custody.

---

## 12. API Reference

### Authentication
```
POST   /api/auth/register      — Create account (body: username, email, password, role, walletAddress)
POST   /api/auth/login          — Login (body: email, password) → returns JWT
GET    /api/auth/me             — [Auth] Get current user profile
GET    /api/auth/users          — [Admin] List all users
```

### Batch Management
```
POST   /api/batch/create        — [Manufacturer] Create batch
POST   /api/batch/transfer      — [Mfr/Dist/Pharm] Transfer batch ownership
GET    /api/batch               — [Auth] List batches (role-filtered)
GET    /api/batch/:batchId      — Get batch details
GET    /api/batch/:batchId/history — Get transfer history
GET    /api/batch/:batchId/qr   — Get QR code image
```

### Verification
```
POST   /api/verify/scan         — Scan & verify (logs scan, runs anomaly detection)
GET    /api/verify/:batchId     — Quick verify (no scan log)
GET    /api/verify/:batchId/scans — Get scan logs for a batch
```

### Admin
```
GET    /api/admin/dashboard         — [Admin] System stats
POST   /api/admin/register-stakeholder — [Admin] Register user on blockchain
GET    /api/admin/stakeholders      — [Admin] List all stakeholders
```

### Health Check
```
GET    /api/health              — Server health status
```

---

## 13. Testing

### Smart Contract Tests

Located in `test/PharmSupplyChain.test.js`. Run with:
```bash
npx hardhat test
```

**Test Suites (16 test cases):**

| Suite | Tests | What's Covered |
|---|---|---|
| Deployment | 2 | Admin is set correctly, admin tracked in stakeholder list |
| Stakeholder Registration | 4 | Register manufacturer, reject duplicates, reject non-admin, reject Role.None, event emission |
| Batch Creation | 5 | Manufacturer creates batch, non-manufacturer rejected, duplicate ID rejected, past expiry rejected, event emission, batch tracking |
| Batch Transfer | 5 | Manufacturer→Distributor, full chain flow, history recording, invalid order rejected, non-owner rejected, unregistered recipient rejected, event emission |
| Batch Verification | 2 | Verify valid batch, report non-existent as invalid |
| Batch Deactivation | 3 | Admin can deactivate, manufacturer can deactivate own, unauthorized user rejected |

---

## 14. Environment Variables

### Backend (`backend/.env`)
| Variable | Example | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | `my-secret-key` | Secret for signing JWT tokens |
| `PORT` | `5000` | Backend server port |
| `RPC_URL` | `http://127.0.0.1:8545` | Ethereum JSON-RPC endpoint |
| `CONTRACT_ADDRESS` | `0x5FbDB...` | Deployed smart contract address |
| `ADMIN_PRIVATE_KEY` | `0xac09...` | Hardhat Account #0 private key (admin) |

### Frontend (`frontend/.env`)
| Variable | Example | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |
| `VITE_CONTRACT_ADDRESS` | `0x5FbDB...` | Same contract address as backend |
| `VITE_RPC_URL` | `http://127.0.0.1:8545` | Same RPC endpoint for direct reads |

> ⚠️ **Security Note**: The `ADMIN_PRIVATE_KEY` and user private keys are stored in plain text for **demo/development purposes only**. In a production system, private keys should **never** be stored on a server. Instead, use wallet signing (e.g., MetaMask) where users sign transactions in their own browser.

---

*Last updated: April 2026*
