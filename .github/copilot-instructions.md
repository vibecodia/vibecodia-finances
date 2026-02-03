# Vibecodia Finances - AI Coding Agent Instructions

## Project Overview
Vibecodia Finances is a full-stack personal financial management application built with **React 18 + TypeScript (frontend)** and **Express + MongoDB (backend)**. It supports PIN-based multi-user access with account-level data isolation.

**Key Purpose:** Household budget tracking with recurring transactions, savings goals, payment status management, and financial reports.

---

## Architecture

### Frontend (React + TypeScript)
- **Framework:** Vite + React 18
- **State Management:** React Context (VerificationContext) + custom hooks (useFinancialData)
- **Styling:** Tailwind CSS + lucide-react icons
- **Routing:** React Router v6
- **Key Components Location:** [frontend/src/components/](frontend/src/components/)

### Backend (Node.js)
- **Server:** Express.js
- **Database:** MongoDB (PIN-based multi-tenant)
- **Authentication:** PIN verification (no password)
- **File Uploads:** Multer for image handling
- **Cron Jobs:** node-cron for scheduled tasks
- **Server File:** [backend/server.js](backend/server.js)

### Data Flow
1. User enters PIN → VerificationContext stores in cookies (expires 3 days)
2. Frontend sends `x-pin` header with all API requests
3. dbMiddleware routes to correct MongoDB connection based on PIN
4. Data persists per user account, stored in MongoDB

---

## Critical Developer Workflows

### Development Setup
```bash
# From project root
npm install
docker-compose -f infra/docker/docker-compose.yml up --build

# Connects: Frontend (5173) → Backend proxy (3001)
# Backend needs MONGO_CONN_MAP env var: JSON map of PIN → MongoDB URI
```

### Build & Deployment
```bash
npm run build           # TypeScript compilation + Vite build
npm run dev           # Dev server with hot reload
npm start             # Production: Node backend server
npm run lint          # ESLint check
```

### Docker Commands
```bash
# Development
docker-compose up --build

# Production
docker-compose -f infra/docker/docker-compose.prod.yml up --build

# Logs
docker-compose logs -f [service-name]
```

---

## Project-Specific Patterns & Conventions

### Date Handling (Critical!)
- **Always use `getCurrentBrazilDate()`** for current date (handles São Paulo timezone)
- Brazil timezone offset: UTC-3 (no DST)
- All date strings stored as ISO format
- Helper functions in [frontend/src/utils/helpers.ts](frontend/src/utils/helpers.ts):
  - `getCurrentBrazilDate()` → Date object in correct timezone
  - `getBrazilDateString(date)` → 'YYYY-MM-DD' string
  - `formatBrazilDate(date, format)` → formatted display
  - `getMonthKey(date)` → 'YYYY-MM' for grouping

### PIN-Based Multi-Tenancy
- PIN is stored in cookies as `pin_code` (expires 3 days)
- Frontend passes PIN in request header: `'x-pin': pin`
- Backend middleware extracts PIN and connects to correct MongoDB database
- All queries filtered by PIN automatically
- Example from [frontend/src/hooks/useFinancialData.ts](frontend/src/hooks/useFinancialData.ts):
  ```typescript
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-pin': pin || '',
  }), [pin]);
  ```

### Type System (TypeScript)
- Core types in [frontend/src/types/index.ts](frontend/src/types/index.ts)
- Key entities: `Transaction`, `SavingsGoal`, `SavingsContribution`, `MonthlyBalance`
- All entities use both `_id` (MongoDB) and `id` (compatibility) fields
- Transactions support `recurrence: 'none' | 'weekly' | 'monthly' | 'yearly'`
- `isPaid` boolean tracks payment status (critical for reports)

### Custom Hooks Pattern
- **useFinancialData:** Fetches transactions, goals, calculates monthly balances
- **useVerification:** Manages PIN authentication, timeout, logout
- **useShoppingList:** Shopping list state management
- **useWindowSize:** Responsive component sizing
- Hooks should initialize from API only once (guard with `isInitializing`)

### Component Structure
- Components are **page-level** (Dashboard, Reports, TransactionList) or **UI components** (modals, forms)
- Page components receive data via props from App.tsx
- Use React Router for navigation between pages
- Theme context available globally for dark/light mode toggle

### API Routes (Backend)
**Transactions:** 
- GET/POST `/api/transactions`
- PUT/DELETE `/api/transactions/:id`

**Goals & Contributions:**
- GET/POST `/api/goals`
- PUT/DELETE `/api/goals/:id`
- POST `/api/goals/:id/contributions`
- PUT/DELETE `/api/goals/:goalId/contributions/:contributionId`

**Shopping List:**
- GET/POST `/api/shopping-list`
- PUT/DELETE `/api/shopping-list/:id`
- DELETE `/api/shopping-list/purchased`

**PIN Verification:**
- POST `/api/verify-pin` (no dbMiddleware, validates PIN exists in MONGO_CONN_MAP)

All routes except `/verify-pin` and `/health-check` use **dbMiddleware** to inject PIN-specific database connection.

### Balance Calculations
- Use `calculateBalances()` from [frontend/src/utils/balanceCalculations.ts](frontend/src/utils/balanceCalculations.ts)
- Only counts `isPaid: true` transactions in calculations
- Returns: `{ totalBalance, adjustedBalance, goalsImpact }`
- Monthly summaries pre-calculated in useFinancialData hook

### Styling Conventions
- Tailwind CSS only (no inline styles)
- Dark mode via ThemeContext: `theme === 'dark'`
- Color palette: Nordic theme (blues/greens)
- Icons from lucide-react
- Form inputs use consistent styling across components

---

## Integration Points

### Environment Configuration
- Frontend: `frontend/.env` - VITE_* variables
- Backend: `infra/docker/.env` - NODE_ENV, PORT, MONGO_CONN_MAP
- Vite proxy (dev): `/api` → `http://localhost:3001`

### Key External Dependencies
- **date-fns + ptBR locale:** All date formatting
- **axios:** HTTP requests (some files may use fetch)
- **chart.js + react-chartjs-2:** Report charts
- **mongoose:** MongoDB ORM (backend)
- **multer:** File uploads (backend)
- **node-cron:** Scheduled tasks (backend)

### Image Upload Flow
1. Frontend: [frontend/src/components/ImageUpload.tsx](frontend/src/components/ImageUpload.tsx)
2. POST to `/api/upload` with multipart form-data
3. Backend saves to `backend/uploads/` directory
4. Returns filename for storage in transaction/goal records

---

## Common Gotchas & Constraints

1. **Timezone:** Always use `getCurrentBrazilDate()` - never use `new Date()`
2. **PIN Required:** Queries without PIN header will fail - ensure headers in all API calls
3. **isPaid Boolean:** Payment status critical for all balance/report calculations
4. **Recurrence:** Handled client-side with `generateRecurringTransactions()` - server stores transactions individually
5. **Monthly Balance:** Use `monthlyBalances` from useFinancialData, not calculated inline
6. **Docker Volumes:** Frontend at `/app/frontend`, backend at `/app/backend`, uploads at `/app/uploads`

---

## File Structure Quick Reference

| Path | Purpose |
|------|---------|
| [frontend/src/components/](frontend/src/components/) | React page & UI components |
| [frontend/src/contexts/](frontend/src/contexts/) | Auth (VerificationContext), Theme |
| [frontend/src/hooks/](frontend/src/hooks/) | Data fetching & state logic |
| [frontend/src/types/index.ts](frontend/src/types/index.ts) | TypeScript type definitions |
| [frontend/src/utils/helpers.ts](frontend/src/utils/helpers.ts) | Date, currency, calculation helpers |
| [backend/server.js](backend/server.js) | Express server & all API routes |
| [backend/connectionManager.js](backend/connectionManager.js) | MongoDB connection pooling |
| [infra/docker/](infra/docker/) | Docker Compose & Dockerfile configs |

---

## Testing & Debugging

- **Health Check:** GET `/api/health-check` (no auth required)
- **Connection Test:** `npm run test-connection` (validates MongoDB connectivity)
- **ESLint:** `npm run lint` (checks frontend TypeScript/JSX)
- **Docker Logs:** `docker-compose logs -f [service]` for debugging containers
