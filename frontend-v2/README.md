# SarkariExams.me - New Frontend

A premium, modern frontend for SarkariExams.me built with Next.js 15, Tailwind CSS v4, and shadcn/ui. Features a Bold & Modern design with navy blue + orange accent colors.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theme**: Dark/Light mode support

## Features

### Core Pages
- **Homepage** (`/`) - Hero section, category grid, featured jobs, latest updates
- **Jobs Listing** (`/jobs`) - Advanced filters, department/state/qualification filtering
- **Results** (`/results`) - Exam results, merit lists, declared/expected tabs
- **Admit Cards** (`/admit-cards`) - Hall ticket downloads with urgency indicators
- **Job Detail** (`/jobs/[id]`) - Visual timeline, eligibility, how to apply, documents

### Premium Features
- **Bold & Modern Design** - Navy blue (#0F172A) + Orange (#F97316) theme
- **Visual Timeline** - Interactive timeline for job important dates
- **Dark Mode** - Full dark mode support with persistent preference
- **Advanced Search** - Search with filters for jobs, departments, locations
- **Mobile-First** - Responsive design with mobile bottom navigation
- **SEO Optimized** - Meta tags, Open Graph, Twitter Cards
- **Loading States** - Skeleton loaders for better UX
- **Animations** - Framer Motion page transitions and micro-interactions

## Project Structure

```
frontend-v2/
├── app/
│   ├── (home)/
│   │   └── page.tsx           # Homepage
│   ├── jobs/
│   │   ├── page.tsx           # Jobs listing
│   │   └── [id]/
│   │       └── page.tsx       # Job detail with timeline
│   ├── results/
│   │   └── page.tsx           # Results page
│   ├── admit-cards/
│   │   └── page.tsx           # Admit cards page
│   ├── layout.tsx             # Root layout with providers
│   ├── loading.tsx            # Loading skeleton
│   └── globals.css            # Global styles with theme
├── components/
│   ├── layout/
│   │   ├── header.tsx         # Sticky header with search
│   │   ├── footer.tsx         # Rich footer with stats
│   │   └── mobile-bottom-nav.tsx  # Mobile navigation
│   ├── theme-provider.tsx     # Dark mode provider
│   └── ui/                    # shadcn components
├── lib/
│   ├── seo.ts                 # SEO configuration
│   └── utils.ts               # Utility functions
└── public/                    # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Navigate to the project:
```bash
cd frontend-v2
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

### Run With PM2

Use the committed PM2 config from the repository root so the process always starts with the correct working directory:

```bash
cd ~/sarkari-result
npm --prefix frontend-v2 run build
pm2 delete frontend-v2 || true
pm2 start ecosystem.config.cjs --only frontend-v2
pm2 save
```

If PM2 starts `next` from the repo root instead of `frontend-v2`, Next.js will fail with:

```text
Could not find a production build in the '.next' directory
```

That error means the build exists, but the process manager is looking in the wrong directory.

## Design System

### Colors
- **Primary**: #0F172A (Navy Blue)
- **Accent**: #F97316 (Orange)
- **Background Light**: #FFFFFF
- **Background Dark**: #0F172A
- **Text Light**: #0F172A
- **Text Dark**: #F8FAFC

### Typography
- **Font**: Geist Sans (Headings), Geist Mono (Code)
- **Scale**: Tailwind defaults with custom sizing

### Spacing
- Container: max-w-7xl
- Section padding: py-12 to py-20
- Card padding: p-6

## API Integration (Ready)

The frontend is ready for API integration. Key areas:

1. **Jobs Data** - Replace mock data in `/app/jobs/page.tsx`
2. **Job Detail** - Connect to API in `/app/jobs/[id]/page.tsx`
3. **Search** - Implement search API endpoint
4. **Filters** - Connect filter dropdowns to backend

### Example API Structure
```typescript
interface Job {
  id: string;
  title: string;
  organization: string;
  department: string;
  location: string;
  posts: number;
  salary: string;
  qualification: string;
  lastDate: string;
  // ... more fields
}
```

## Performance

- **Next.js 15** with React Server Components
- **Image Optimization** with next/image
- **Code Splitting** by route
- **Font Optimization** with next/font
- **CSS Optimization** with Tailwind v4

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

**Built with ❤️ for job seekers across India**
