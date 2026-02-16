# Sarkari Result - Government Jobs Portal

A modern, fast, and feature-rich government jobs portal built with React + Vite (Frontend) and Node.js + Express + MongoDB (Backend).

## 🚀 Features

- **Job Listings** - Latest government jobs, results, admit cards, answer keys
- **PWA Support** - Install as mobile app, offline access
- **Dark Mode** - Eye-friendly dark theme
- **Push Notifications** - Get notified about new jobs
- **Email Subscriptions** - Daily/weekly job alerts
- **Search & Filters** - Find jobs by location, qualification, category
- **Bookmarks** - Save jobs for later with CSV/PDF export
- **SEO Optimized** - JSON-LD schema for Google Jobs

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Vite |
| Styling | CSS3 with CSS Variables |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB / Azure Cosmos DB |
| Hosting | Digital Ocean |

## 📦 Quick Start

### Prerequisites
- Node.js 22+
- MongoDB 6.0+
- npm or yarn

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start server
npm run dev
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Connection string for CosmosDB or MongoDB
COSMOS_CONNECTION_STRING=mongodb://localhost:27017/sarkari_db
COSMOS_DATABASE_NAME=sarkari_db
JWT_SECRET=your-secret-key
PORT=5000

# Optional
SENDGRID_API_KEY=your-sendgrid-key
TELEGRAM_BOT_TOKEN=your-bot-token
VAPID_PUBLIC_KEY=your-vapid-public
VAPID_PRIVATE_KEY=your-vapid-private

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://sarkariexams.me,https://www.sarkariexams.me

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20

# Admin security (recommended in production)
ADMIN_SETUP_KEY=change-this-strong-key
ADMIN_REQUIRE_2FA=true
ADMIN_EMAIL_ALLOWLIST=admin@example.com
ADMIN_DOMAIN_ALLOWLIST=example.com
ADMIN_ENFORCE_HTTPS=true
TOTP_ENCRYPTION_KEY=change-this-strong-encryption-key
ADMIN_BACKUP_CODE_SALT=change-this-backup-salt
```

### Frontend (.env)
```env
VITE_API_BASE=http://localhost:5000
```

## 📁 Project Structure

```
├── docs/              # Documentation & Deployment guides
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── context/       # React context
│   │   └── styles.css     # Global styles
│   └── tests/             # Playwright E2E tests
│
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   └── services/      # Business logic
│   └── dist/              # Compiled output
```

## 🧪 Testing

```bash
# Backend checks
cd backend
npm run lint
npm run test:ci

# Frontend checks
cd ../frontend
npm run lint
npm run build
npm run test:e2e:ci
```

Admin smoke tests (optional) read credentials from environment variables:
```
ADMIN_TEST_EMAIL=admin@example.com
ADMIN_TEST_PASSWORD=your-password
# Optional when 2FA is enforced:
ADMIN_TEST_TOTP=123456
ADMIN_TEST_BACKUP_CODE=ABCD-1234
```

## 🚀 Deployment

### Deployment

Please refer to:
- `docs/CLOUDFLARE_SETUP.md`
- `docs/DIGITALOCEAN_DEPLOY.md`

## 📊 Performance

- **Database Pool**: 50 connections (optimized)
- **Rate Limiting**: 200 req/min per IP
- **Caching**: In-memory cache (5min TTL)
- **PWA**: Service worker for offline support

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

**Live Demo**: https://sarkariexams.me

**API**: https://api.sarkariexams.me
