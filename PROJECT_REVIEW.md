# Showroom Management – Project & Business Model Review

This document summarizes a review of the project for business-model consistency, naming, and structural issues.

---

## 1. What the System Does (Business Model)

- **Showrooms**: Multiple dealers; each has vehicles and controllers (users).
- **Inventory (Vehicles)**: Per showroom; status `available` or `sold`.
- **Sales**: A “sale” = one **Transaction** (type `sale`) linking one vehicle, purchaser, payment, owner/dealer/salesman details. Creating a sale marks the vehicle as `sold` and generates two PDFs (customer receipt + internal copy) with QR to a public verification page.
- **Roles**: Admin (all showrooms) vs Controller (one showroom).
- **Activity log**: Tracks key actions (login, transaction create, etc.).

The core idea is consistent: one sale = one transaction = one car “account” (contract) with PDFs and verification.

---

## 2. Issues & Recommendations

### 2.1 Duplicate UI for the Same Data (Car Account vs Transactions)

**Issue:** Two nav items show the same underlying data:

- **Car Account** → list from `GET /transactions` + “New Car Account” creates `POST /transactions` (sale).
- **Transactions** → same list from `GET /transactions` + edit/delete + PDF download.

So “Car Accounts” and “Transactions” are the same list with different labels and slightly different actions (Car Account has “New”, Transactions has PDF download; both have edit/delete). This can confuse users (“Where do I see my sales?”).

**Recommendation:**

- **Option A (simplest):** Keep one section, e.g. **“Sales”** or **“Car Accounts”**:
  - One list page with: New sale, Edit, Delete, Download PDFs.
  - Remove the separate “Transactions” nav item and route, or make “Transactions” an alias to the same page.
- **Option B:** Clearly separate by purpose:
  - **Car Account** = “Create / manage sale contracts” (list + new + full form).
  - **Transactions** = “View history & download PDFs” (read-only list + PDF buttons, or limited edit).
  - Then avoid showing the exact same list in two places; e.g. Car Account = “drafts” or “recent”, Transactions = “all” (only if the business actually has two concepts).

Right now the model has only one concept (Transaction), so Option A is the most consistent.

---

### 2.2 Naming: “Car Account” vs Backend “Transaction”

**Issue:** UI says “Car Account” but the backend has no `CarAccount` model—only `Transaction`. So “Car Account” is really “sale transaction” or “sale contract”.

**Recommendation:** Either:

- Rename in UI to match backend: e.g. “Sales” or “Transactions”, with “New Sale” creating a transaction and PDFs, or
- Keep “Car Account” as the business term and accept that in code it’s implemented as a Transaction (and maybe add a short comment in README/code that “Car Account = sale transaction”).

Both are valid; the main point is to avoid implying a separate “CarAccount” entity when there isn’t one.

---

### 2.3 Transaction Type: Sale vs Purchase

**Issue:** Backend supports `type: 'sale' | 'purchase'`, but the UI only ever creates **sales** (Car Account form sends `type: 'sale'`). There is no flow to create a “purchase” (e.g. showroom buying a car).

**Recommendation:**

- If the business only sells to customers: keep only `sale` in the UI and consider removing or hiding `purchase` in the API/docs to avoid confusion.
- If they also record purchases: add a way to create a purchase (e.g. “New Purchase” or a type selector) and define how it affects inventory (e.g. adds a vehicle or links to one).

---

### 2.4 Payment Methods Not Editable After Create

**Issue:** Transaction has `paymentMethods` (cash/bank/cheque breakdown). The **PUT** handler only allows updating a fixed set of fields and does **not** include `paymentMethods`. The edit modals (Car Account list and Transactions page) only send purchaser, amount, date, notes—so payment breakdown cannot be corrected after creation.

**Recommendation:** If business needs to fix payment split after creation:

- Add `paymentMethods` to the allowed fields in `PUT /transactions` (with validation), and
- Extend the edit modal to show/edit payment method rows (e.g. cash/bank/cheque and amounts).

---

### 2.5 Dashboard: Two Cards for Same Count

**Issue:** Dashboard has two separate cards:
- “Car Accounts” → links to `/car-account`, value `counts.transactions`.
- “Transactions” → links to `/transactions`, value `counts.transactions`.

Same number, two different links. Reinforces the duplication in 2.1.

**Recommendation:** If you merge Car Account and Transactions into one section (2.1), keep a single card (e.g. “Sales” or “Car Accounts”) linking to that one section.

---

### 2.6 README Out of Date

**Issue:** README still mentions:
- “Letters” and “Letters (admin)”.
- API “Accounts (letters): CRUD `/api/accounts`”.

Those features have been removed.

**Recommendation:** Remove all references to Letters and `/api/accounts` from README (and any other docs). See the README update in this repo.

---

### 2.7 Verify Page: No Auth Required (By Design)

**Issue:** Verification is public (`/verify-sale/:id`); no auth. That is correct for “customer scans QR and sees receipt is valid.” Just ensure:
- Only non-sensitive data is returned (receipt number, date, showroom, vehicle summary, purchaser name, amount).
- No internal IDs or controller data are exposed.

Current verify API response looks appropriate for a public receipt check.

---

## 3. What’s Working Well

- **Single source of truth:** One Transaction model; vehicle status (`sold`) and receipt number are consistent.
- **Scoping:** Admin vs controller and showroom-scoped data (vehicles, transactions, stats) is applied consistently.
- **PDFs:** Two PDFs (customer + internal) with QR to verification; flow is clear.
- **Activity logging:** Key actions are logged; useful for auditing.
- **Auth:** JWT, protect + restrictToShowroom, and admin-only routes are used sensibly.

---

## 4. Summary Table

| Area                 | Status        | Action |
|----------------------|---------------|--------|
| Car Account vs Transactions | Redundant UI | Prefer one “Sales”/“Car Accounts” section (Option A in 2.1). |
| Naming (Car Account = Transaction) | Inconsistent naming | Align UI wording with backend or document the mapping. |
| Sale vs purchase     | Only sale in UI | Drop purchase from UI/docs or add purchase flow. |
| Payment methods edit | Not updatable | Add `paymentMethods` to PUT and edit form if needed. |
| Dashboard duplicate cards | Same count, two links | One card when merging Car Account + Transactions. |
| README              | Mentions Letters/accounts | Remove; README updated. |
| Verify / security   | OK            | No change needed for typical use. |

---

*Review based on codebase as of the last edit. Implement the recommendations that match your product and roadmap.*
