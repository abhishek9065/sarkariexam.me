# SarkariExams.me Frontend

This is the frontend application for **SarkariExams.me**, a platform for government jobs, results, admit cards, and related educational news.

## Project Structure

The project is a Single Page Application (SPA) built with:
*   **React 18** (with TypeScript)
*   **Vite** (Build tool & Dev server)
*   **React Router v7** (Routing)
*   **TanStack Query** (Data fetching & State management)
*   **Vite PWA** (Offline support, caching, installable)

### Key Directories

*   `src/components`: UI components organized by feature (admin, cards, common, sections, ui).
*   `src/pages`: Top-level page components (HomePage, DetailPage, AdminPage, etc.).
*   `src/utils`: Helper functions, including the API layer (`api.ts`) and mock data (`mockData.ts`).
*   `src/types`: TypeScript definitions, including auto-generated API types (`api.ts`).

## Features

*   **Job/Result Listings:** Categorized views for Jobs, Results, Admit Cards, etc.
*   **Admin Dashboard:** specialized area (`/admin`) for managing content.
*   **User Features:** Bookmarking, Subscriptions (Email/Push), Profile management.
*   **SEO:** Dedicated SEO components and meta tag management.
*   **Offline Support:** PWA capabilities for offline access to previously visited pages.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

To start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:4173` (port may vary based on vite config).

### Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory.

### Linting and Type Checking

*   **Lint:** `npm run lint`
*   **Type Check:** `npx tsc --noEmit`

### E2E Tests (Playwright)

```bash
npx playwright install
npx playwright test
```

Admin smoke tests can be enabled by setting:
```
ADMIN_TEST_EMAIL=admin@example.com
ADMIN_TEST_PASSWORD=your-password
ADMIN_TEST_TOTP=123456
# or use a backup code:
ADMIN_TEST_BACKUP_CODE=ABCD-1234
```

## Data Handling

The application is designed to fetch data from a backend API. It includes a **mock data fallback** mechanism (`src/utils/mockData.ts`) that activates if the backend is unreachable, allowing for isolated frontend development and testing.

## Configuration

*   **API URL (`VITE_API_BASE`):** If set, frontend calls this base directly (`${VITE_API_BASE}/api`) and bypasses Vite dev proxy.
*   **Dev Proxy Target (`VITE_PROXY_TARGET`):** Controls where Vite forwards `/api` and `/ws` during `npm run dev`.
    *   Default/local backend mode: `http://localhost:5000`
    *   Docker + nginx mode: `http://localhost`
*   **PWA:** Configured in `vite.config.ts`.

### Local Development Modes

1.  **Local backend mode (default)**
    *   Start backend on `http://localhost:5000`
    *   Run frontend:
    ```bash
    npm run dev
    ```

2.  **Docker + nginx mode**
    *   Ensure nginx is reachable on host `http://localhost`
    *   PowerShell:
    ```powershell
    $env:VITE_PROXY_TARGET='http://localhost'
    npm run dev
    ```

### Quick Proxy Verification

With frontend dev server running on `http://localhost:4173`:

*   `GET http://localhost:4173/api/health`
*   `GET http://localhost:4173/api/announcements/v3/cards?type=job&limit=10`
