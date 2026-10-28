# CertiShield — Full Stack Migration & Developer Run Guide
**GRAPHITE 26 &bull; Problem Statement 13: Certificate Authenticity Verifier**

CertiShield is a trustworthy, high-assurance certificate verification and institution trust platform migrated away from PHP/XAMPP to **Node.js + Express + TypeScript** and **PostgreSQL / Resilient Database Engine**.

---

## 1. Quick Start Guide for Windows (No XAMPP Required)

### Prerequisites
- **Node.js** v18+ or v20+ LTS (Tested on Node v24 LTS).
- (Optional) **PostgreSQL** running locally on port 5432, or use the automated zero-setup fallback.

### Step 1: Install Backend Dependencies & Run Database Seed
In PowerShell:
```powershell
# Navigate to the backend directory
cd server

# Install dependencies (only required once)
npm install

# Run database schema migration & synthetic demo seed
npm run seed
```

This sets up all tables and pre-seeds realistic synthetic records for the evaluation walkthrough.

---

### Step 2: Run Automated Tests
```powershell
npm test
```
**Test Results:**
- 12 automated unit, authorization, cryptography, and business logic tests pass directly.

---

### Step 3: Start the Backend API Server
```powershell
npm run dev
```
The backend API server launches at: **`http://localhost:5000`**  
Health Check: **`http://localhost:5000/api/health`**

---

### Step 4: Start the Frontend
In a second terminal window from the root directory:
```powershell
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

## 2. Docker Compose Option (Optional)
If Docker Desktop is installed:
```powershell
docker-compose up -d
```
This spins up a dedicated PostgreSQL container and the Node.js TypeScript server automatically.

---

## 3. Pre-Seeded Demonstration Accounts

| Role | Email | Password | Status | Credits |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@certishield.edu` | `Admin@CertiShield2026` | Approved | N/A |
| **Approved Institution (ACM)** | `acm@studentchapter.edu` | `Organizer@ACM2026` | Approved | 5 Free Credits |
| **Pending Institution (Robotics)**| `robotics@campus.edu` | `Pending@Robot2026` | Pending | 5 Credits Locked |

---

## 4. Problem Statement 13 Evaluation Scenarios

| Scenario | Identifier / Endpoint | Expected Server Verdict |
| :--- | :--- | :--- |
| **1. Genuine Certificate** | `GET /api/public/verify/GPH-26-8F29A` | **VERIFIED GENUINE** (Masked student name, vetted issuer) |
| **2. Revoked Credential** | `GET /api/public/verify/GPH-26-REVOK` | **REVOKED** (*Disqualified for code plagiarism*) |
| **3. Expired Credential** | `GET /api/public/verify/GPH-25-EXPIR` | **EXPIRED** (Expired on June 30, 2025) |
| **4. Unregistered / Forged ID** | `GET /api/public/verify/GPH-26-FAKE99` | **RECORD NOT FOUND** (Honest lookup rejection) |
| **5. File Tamper Mismatch** | `POST /api/public/verify-document` | **TAMPERED / INTEGRITY MISMATCH** (SHA-256 altered) |
| **6. Trust Passport Profile** | `GET /api/public/passport/studentchapter.edu` | **PUBLIC TRUST PASSPORT** (Non-fabricated vetting seal) |

---

## 5. Security & Business Architecture

1. **Strict 5-Free-Credit Transactional Model:**
   - Every newly registered institution is credited exactly 5 free issuance credits.
   - Creating a certificate charges 1 credit from the wallet. Failed issuance consumes 0 credits.
   - Credit transactions are recorded in `credit_ledger` with balance before and after.

2. **Institution-First Administrative Vetting:**
   - Pending institutions are blocked from issuing trusted certificates until approved by an administrator.
   - Domain normalization warns on mismatched website and email domains.

3. **Multi-Tenancy & IDOR Defense:**
   - Event ownership is enforced on the server. Institution A cannot manage or revoke Institution B's events.

4. **Public Privacy Protection:**
   - Verification responses redact sensitive names (`A***n S****a`) and identifiers.
