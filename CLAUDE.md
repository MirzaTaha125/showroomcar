# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack showroom management system for car dealerships. Handles vehicle inventory, delivery/purchase orders, token receipts, financial transactions, agent commissions, and PDF document generation with showroom branding.

## Development Commands

### Backend
```bash
cd backend
npm install
npm run dev        # Dev server with --watch (port 5000)
npm run seed       # Initialize admin user
npm start          # Production server
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Vite dev server (port 3000, proxies /api to port 5000)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

### Environment Setup
Copy `backend/.env.example` to `backend/.env` and set:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `FRONTEND_URL` - Frontend origin for CORS (default: `http://localhost:3000`)
- `PORT` - Backend port (default: 5000)

## Architecture

### Stack
- **Backend:** Node.js (ES modules) + Express 4 + MongoDB/Mongoose
- **Frontend:** React 18 + Vite + React Router 6 + Axios + React Hook Form
- **PDF Generation:** PDFKit + QRCode (server-side, on-demand)
- **Auth:** JWT with bcryptjs password hashing

### Data Model Relationships
```
Showroom ─── User (admin manages all; user scoped to one showroom)
         ─── Vehicle
         ─── CarAccount (delivery/purchase orders)
              └── Transaction (financial record)
              └── AgentCommission (unique per CarAccount)
         ─── TokenReceipt
         ─── ActivityLog
```

**CarAccount** is the central entity — stores complete purchaser/seller/owner details, payment breakdowns (cash/online/cheque/token), and inline vehicle data. It drives PDF generation and transaction tracking.

### Auth & Access Control
- Two roles: `admin` (all showrooms) and `user` (scoped to assigned showroom)
- Middleware chain: `protect` (JWT validation) → `adminOnly` or `restrictToShowroom`
- Middleware lives in `backend/middleware/auth.js`

### API Structure (`backend/routes/`)
All routes under `/api/`:
- `auth` — login, register, `/me`
- `car-accounts` — delivery/purchase orders + biometric upload
- `pdf` — PDF generation for car accounts and token receipts
- `token-receipts` — token receipt CRUD
- `transactions`, `vehicles`, `users`, `showrooms`
- `agent-commissions`, `activity-logs`, `stats`
- `verify/:id` — public document verification (no auth required)
- `uploads/logos`, `uploads/biometrics` — static file serving

### PDF Generation
PDF documents are generated on-demand in `backend/services/pdfService.js` and `tokenReceiptPdfService.js`. They embed showroom branding (logo via sharp), QR codes linking to the public `/verify/:id` page, and use Pakistani number format (Lakh/Crore). The Vite proxy has a 60-second timeout to accommodate PDF generation.

### Frontend API Layer
`frontend/src/api/client.js` is an Axios instance that injects the JWT token from localStorage on every request. Service files (`carAccountService.js`, `tokenReceiptService.js`, etc.) wrap specific endpoint calls. Auth state is managed via `AuthContext.jsx`.

### File Uploads
- Showroom logos: `POST /api/showrooms/upload-logo` → stored in `backend/uploads/logos/`
- Biometric images: `POST /api/car-accounts/upload-biometric` → stored in `backend/uploads/biometrics/`
- Both use multer with MIME type validation and size limits

### Activity Logging
All significant create/update operations call `logActivity()` from `backend/utils/activityLog.js`. The call must be inside the `try` block before sending the response to avoid unhandled async errors.

## No Test Suite
There is no automated test suite. Manual testing is performed. Helper scripts in `backend/scripts/` exist for seeding data and testing PDF generation (`testPdfMarkaz.js`, `testPdfV2.js`).
