# Mini ERP + CRM Operations Portal

A mature, purpose-built internal business operations portal combining core **Customer Relationship Management (CRM)**, **Inventory & Product Management**, and **Sales Challan Processing** with atomic, stock-safe confirmation logic and strict **Role-Based Access Control (RBAC)**.

---

## 🏛 Architecture Overview

The system follows a modern decoupled architecture consisting of a **React + TypeScript** Single-Page Application (SPA) on the frontend and a **Node.js + Express + TypeScript** REST API on the backend, communicating over HTTP/JSON secured by stateless JSON Web Tokens (JWT). The backend connects to a **PostgreSQL** relational database managed via **Prisma ORM** for type-safe database queries, schema migrations, and atomic transactions.

```mermaid
graph LR
    Client["💻 React SPA (Vite + TS)"] -- "REST API / JSON (JWT Bearer)" --> API["⚙️ Express API Server (Node.js + TS)"]
    API -- "Prisma ORM (Transactions / Pools)" --> DB[("🗄️ PostgreSQL Database (Neon / Local)")]
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, React Router v6, Axios, Custom Vanilla CSS Design System |
| **Backend** | Node.js, Express 5, TypeScript, Zod (Validation), JSON Web Tokens (JWT), Bcrypt |
| **Database & ORM** | PostgreSQL (Neon / Supabase / Docker), Prisma ORM v7 |
| **DevOps & Tools** | Docker, Docker Compose, Postman Collection, ESLint |

---

## 📂 Folder Structure

```
mini_ERP_and_CRM/
├── backend/                  # Node.js + Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma     # Database models, enums & relations
│   │   ├── migrations/       # SQL migration snapshots
│   │   └── seed.ts           # Initial test users and sample data
│   ├── src/
│   │   ├── lib/              # Prisma client & query helpers
│   │   ├── middleware/       # JWT authenticate, RBAC authorize & global error handler
│   │   ├── routes/           # REST endpoints (auth, customers, products, challans)
│   │   └── index.ts          # Express application setup & CORS configuration
│   └── Dockerfile            # Multi-stage Docker build for production
├── frontend/                 # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── api/              # Centralized Axios client with interceptors
│   │   ├── components/       # Layout (Sidebar, TopBar), badges, reusable components
│   │   ├── contexts/         # AuthContext & ToastContext providers
│   │   ├── pages/            # Dashboard, Customers, Products, Challans & Login
│   │   ├── index.css         # Custom Design Tokens, utility classes & responsive styles
│   │   └── App.tsx           # Router & protected role-based routes
│   └── Dockerfile            # Multi-stage build with Nginx for SPA serving
├── postman_collection.json   # Exported Postman collection for all API endpoints
├── docker-compose.yml        # Full-stack local Docker orchestration (Postgres, API, UI)
├── todo.md                   # Project implementation plan & checklist
└── README.md                 # Project documentation
```

---

## 🔐 Role-Based Access Control (RBAC) & Seeded Credentials

The system implements 4 distinct business roles enforced at both the API middleware level (`authorize(...roles)`) and the UI level (conditional navigation & actions):

| Role | Permissions & Access Capabilities |
| :--- | :--- |
| **ADMIN** | Full system access: manage users, create/edit customers, products, stock adjustments, and sales challans. |
| **SALES** | Manage Customer CRM (create/update profiles, follow-up notes) and Sales Challans (create/edit drafts, confirm sales). Read-only product catalog. |
| **WAREHOUSE** | Manage Inventory: create/update product catalog and execute manual stock adjustments (`IN` / `OUT`). Read-only challan access. |
| **ACCOUNTS** | Audit & verification access across customers, products, stock movements, and confirmed sales challans. |

### Seeded Test Users

When you run `npm run prisma:seed` (or start via Docker), the following test credentials are automatically created:

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `admin123` |
| **SALES** | `sales@example.com` | `sales123` |
| **WAREHOUSE** | `warehouse@example.com` | `warehouse123` |
| **ACCOUNTS** | `accounts@example.com` | `accounts123` |

---

## ⚡ Quick Start & Setup Guide

### Option A: Running with Docker Compose (Recommended)
You can launch the entire stack (PostgreSQL + Backend API + Frontend UI) locally with one command:

```bash
# Start all services in detached mode
docker-compose up --build -d

# Check service logs
docker-compose logs -f
```
Once healthy:
- **Frontend Portal**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Postgres DB**: `localhost:5432` (`mini_erp`)

---

### Option B: Local Development Setup (Manual)

#### 1. Prerequisites
- Node.js (`>= 18.x`)
- PostgreSQL instance running locally or hosted on Neon/Supabase

#### 2. Backend Setup (`/backend`)
```bash
cd backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

Edit `backend/.env` with your database connection:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/mini_erp?schema=public"
JWT_SECRET="your_secure_random_jwt_secret_key"
```

Apply schema migrations and seed initial data:
```bash
# Run migrations against your database
npx prisma migrate dev

# Seed users and sample records
npm run prisma:seed

# Start the API development server
npm run dev
```

#### 3. Frontend Setup (`/client` or `/frontend`)
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Create environment configuration (optional if API runs on localhost:5000)
# Create a .env file containing:
# VITE_API_URL=http://localhost:5000

# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:5173` (or the port displayed by Vite) and log in using any seeded credentials.

---

## 🧪 API Documentation & Postman Collection

A complete Postman collection is included in the project root: `postman_collection.json`.

### How to use:
1. Open **Postman** and select **Import** -> Select `postman_collection.json`.
2. The collection includes pre-configured collection variables:
   - `baseUrl`: defaults to `http://localhost:5000`
   - `token`: automatically populated after executing any **Login** request!
3. All endpoints across Authentication, Customer CRM, Products & Inventory, and Sales Challans include realistic JSON request bodies and parameter documentation.

---

## 🚀 Key Architectural Highlights & Business Logic

### 1. Atomic Stock-Safe Challan Confirmation (`POST /challans/:id/confirm`)
To guarantee data integrity under concurrent multi-user access, confirming a sales challan executes inside a strict **Prisma ACID transaction (`prisma.$transaction`)**:
1. Locks and verifies current available stock (`currentStock`) for **every** product item in the challan.
2. If any product has insufficient stock (`quantity > currentStock`), the entire transaction aborts immediately and returns `409 Conflict` with a detailed shortage breakdown without modifying any records.
3. If all items have sufficient inventory:
   - Decrements `currentStock` across all affected products.
   - Inserts immutable `StockMovement` records (`movementType: 'OUT'`, with challan reference and user audit trail).
   - Transitions the challan status from `DRAFT` to `CONFIRMED`.

### 2. Historical Price & SKU Snapshotting
When a `ChallanItem` is created or updated while in `DRAFT`, the system captures exact snapshots of the product's name, SKU, and unit price (`productNameSnapshot`, `productSkuSnapshot`, `unitPriceSnapshot`). This ensures that future changes to product catalog pricing or SKUs do not alter historical financial records.

---

## 🌐 Production Deployment Guide

### 1. Database (Neon / Supabase)
1. Provision a Postgres database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the pooled connection string (`postgresql://...`).

### 2. Backend (Render / Railway / Fly.io)
1. Create a new Web Service pointing to the `/backend` folder.
2. **Build Command**: `npm install && npx prisma generate && npm run build`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   - `DATABASE_URL`: Your production Postgres URL.
   - `JWT_SECRET`: A long, high-entropy secret string.
   - `PORT`: `5000` (or dynamically assigned by provider).
5. Execute `npx prisma migrate deploy` to push schema migrations to production.

### 3. Frontend (Vercel / Netlify)
1. Connect repository and select the `/frontend` root directory.
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Environment Variables**:
   - `VITE_API_URL`: The deployed production backend HTTPS URL.

---

## ⚠️ Known Limitations & Assumptions

1. **Authentication Expiry**: JWT tokens are currently issued with an 8-hour expiration for simplicity. In a high-security enterprise deployment, a dual refresh/access token rotation mechanism with HTTP-only cookies should be used.
2. **Challan Cancellation Policy**: By default, cancelling a `DRAFT` challan marks it as cancelled cleanly. Cancelling a `CONFIRMED` challan re-increments inventory (`IN` stock movement) to restore physical count.
3. **Pagination Limit**: API endpoints enforce default pagination of 20 items per page with optional `limit` overrides up to 100 items per query to prevent unbounded database queries.
