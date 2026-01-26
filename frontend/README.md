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

## Data Handling

The application is designed to fetch data from a backend API. It includes a **mock data fallback** mechanism (`src/utils/mockData.ts`) that activates if the backend is unreachable, allowing for isolated frontend development and testing.

## Configuration

*   **API URL:** Configured via `VITE_API_BASE` environment variable (defaults to empty string, relative path).
*   **PWA:** Configured in `vite.config.ts`.
