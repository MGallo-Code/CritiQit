# CritiQit - A Unified Rating Platform

> **Rate, Review, and Discover** - A flexible rating platform for movies, TV shows, and beyond.

[![Production Ready](https://img.shields.io/badge/status-production--ready-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 🎯 What is CritiQit?

CritiQit is a **multi-platform rating application** that allows users to rate, review, and organize various items using flexible and hierarchical scoring systems. Starting with movies and TV shows, it's designed to be extensible to music, books, recipes, and anything you want to rate.

### Core Features

- **⭐ Flexible Rating System**: Simple star ratings (0-10) or detailed category-based breakdowns with weighted scoring
- **📊 Hierarchical Aggregation**: TV shows automatically calculate season/episode averages using database triggers
- **📚 Collections**: Create and manage personal collections of rated items
- **👥 Social Features**: Follow friends, comment on ratings, discover through your network
- **🎨 User-Defined Templates**: Create custom rating categories or use community templates
- **🔒 Secure & Scalable**: Production-ready with three-tier rate limiting and comprehensive security

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- [Next.js 15](https://nextjs.org/) - React framework with App Router
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Supabase Client](https://supabase.com/docs/reference/javascript) - Backend integration

**Backend:**
- [Supabase](https://supabase.com/) - Self-hosted backend (Docker)
- [PostgreSQL](https://www.postgresql.org/) - Database with RLS (Row Level Security)
- [Kong Gateway](https://konghq.com/) - API gateway with custom rate limiting plugin
- [GoTrue](https://github.com/supabase/gotrue) - Authentication service
- Edge Functions - Serverless functions (Deno)

**Infrastructure & Deployment:**
- [Docker Compose](https://docs.docker.com/compose/) - Development and production orchestration
- [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) - Free SSL, CDN, DDoS protection
- Self-hosted VPS deployment - Cost-effective (~$5-20/month)
- [GitHub Actions](https://github.com/features/actions) - CI/CD (planned)

### Project Structure

```
CritiQit/
├── frontend/              # Next.js 15 application
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities, Supabase client
│   └── public/           # Static assets
│
├── supabase/             # Self-hosted Supabase backend
│   ├── migrations/       # Database migrations
│   ├── functions/        # Edge Functions
│   ├── volumes/          # Docker volumes (Kong, DB, etc.)
│   ├── compose.yml       # Docker Compose configuration
│   └── config.toml       # Supabase configuration
│
└── .context/             # Project documentation
    ├── CLAUDE.md         # Current project state
    ├── design-system.md  # Complete design specifications
    ├── frontend.md       # Frontend patterns
    ├── backend.md        # Backend patterns
    └── sessions.md       # Development history
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for Next.js)
- **Docker** & **Docker Compose** (for Supabase)
- **Git** (for version control)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/CritiQit.git
   cd CritiQit
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Frontend (.env.local)
   cp frontend/.env.example frontend/.env.local
   # Edit with your Supabase URL and anon key

   # Backend (.env)
   cp supabase/.env.example supabase/.env
   # Edit with your secrets (see .env.example for details)
   ```

4. **Start Supabase (Docker):**
   ```bash
   cd supabase
   docker compose up -d
   ```

5. **Run database migrations:**
   ```bash
   cd supabase
   npx supabase db push --debug --db-url "postgresql://supabase_admin:your-password@localhost:5432/postgres"
   ```

6. **Start frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8000
   - Supabase Studio: http://localhost:8443

---

## 🎨 Design System

CritiQit features a **warm, professional design** inspired by movie theaters:

- **Deep Red Accents** - Movie theater curtains aesthetic
- **Pastel Yellow Stars** - Warm, inviting rating displays
- **Dark Mode Primary** - Optimized for movie watching vibe
- **Accessible to All** - WCAG AAA compliance
- **Mobile-First** - Touch-friendly, responsive design

See [`.context/design-system.md`](.context/design-system.md) for complete specifications.

---

## 🔐 Security Features

### Three-Tier Rate Limiting

CritiQit implements a production-ready rate limiting system via Kong Gateway:

1. **Tier 1 (IP-based)**: Anonymous users - 100 requests/hour
2. **Tier 2 (Content-based)**: Auth actions (signup, login) - 10 attempts/hour per email
3. **Tier 3 (User-based)**: Authenticated users - 1000 requests/hour

### Additional Security

- Row Level Security (RLS) on all database tables
- Service role key never exposed to clients
- Input validation on frontend, backend, and database layers
- CSRF protection via Next.js Server Actions
- No SQL injection (parameterized queries only)
- Secure secret management (no commits to git)

---

## 🤖 AI Agent System

CritiQit uses a custom AI agent system for development:

### Implementation Agents
- **`frontend-dev`** - Next.js, React, Tailwind, UI/UX
- **`backend-dev`** - Supabase, PostgreSQL, RLS, migrations
- **`full-stack-integrator`** - Coordinates frontend + backend features

### Quality Assurance Agents
- **`design-reviewer`** - Ensures design system compliance and accessibility
- **`security-auditor-frontend`** - Hunts XSS, secrets exposure, auth bypass
- **`security-auditor-backend`** - Hunts SQL injection, RLS bypass, storage gaps
- **`security-auditor-infrastructure`** - Hunts exposed ports, weak secrets, misconfigs
- **`security-coordinator`** - Orchestrates security audits and fix delegation

### Commands
- **`/implement "feature"`** - Build full-stack features with architectural planning
- **`/audit`** - Run comprehensive security audit (frontend + backend + infrastructure)
- **`/update-session`** - Document progress mid-session
- **`/save-session`** - Finalize session and update context files

---

## 📚 Development Workflow

### Adding a New Feature

1. **Plan with full-stack-integrator:**
   ```bash
   /implement "add commenting system to movie ratings"
   ```

2. **Agent Flow:**
   - Consults frontend-dev and backend-dev specialists
   - Synthesizes unified architectural plan
   - Defines TypeScript interfaces and API contracts
   - Delegates implementation to specialists
   - Verifies type safety and integration

3. **Review design compliance:**
   ```bash
   Use design-reviewer agent to ensure design system compliance
   ```

4. **Run security audit:**
   ```bash
   /audit
   ```

5. **Commit and document:**
   ```bash
   git add .
   git commit -m "Add commenting system with RLS and rate limiting"
   /update-session
   ```

### Database Changes

1. Create migration in `supabase/migrations/`
2. Write idempotent SQL (use `IF NOT EXISTS`, `ON CONFLICT`)
3. Include RLS policies with both `USING` and `WITH CHECK`
4. Test with `supabase db push`
5. Never use destructive resets without user permission

### Frontend Changes

1. Follow design system specifications
2. Use Tailwind classes (no custom CSS unless necessary)
3. Ensure WCAG AA accessibility (AAA preferred)
4. Mobile-first responsive design
5. Test dark mode thoroughly

---

## 🧪 Testing

### Manual Testing Checklist

**Frontend:**
- [ ] Mobile responsive (320px to 1440px)
- [ ] Dark mode works correctly
- [ ] Touch targets ≥44x44px
- [ ] Keyboard navigation functional
- [ ] Screen reader accessible (test with VoiceOver/NVDA)
- [ ] Color contrast ≥4.5:1

**Backend:**
- [ ] RLS policies tested with bypass attempts
- [ ] Rate limiting blocks excessive requests
- [ ] No SQL injection vulnerabilities
- [ ] Service role key not exposed
- [ ] Error messages don't leak info

**Integration:**
- [ ] Frontend types match backend schema
- [ ] Auth flows work end-to-end
- [ ] Loading states display correctly
- [ ] Error handling graceful

---

## 🚀 Production Deployment

### Cost-Effective Self-Hosted Strategy

CritiQit is designed for **self-hosted deployment** with predictable, minimal costs while maintaining production quality.

**Deployment Cost**: ~$5-20/month for complete stack (vs $200-400/month on traditional platforms)

### Quick Start (Production)

**Option 1: Docker Compose (Recommended)**
```bash
# Uncomment frontend service in supabase/compose.yml
cd supabase
docker compose up -d
```

**Option 2: Standalone Docker**
```bash
cd frontend
docker build -t critiqit-frontend .
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://api.critiqit.io \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  --name critiqit-frontend \
  critiqit-frontend
```

### Infrastructure Stack

- **VPS**: Hetzner Cloud (€4.15/month) or DigitalOcean ($6/month)
- **Frontend**: Self-hosted Next.js via Docker (`output: 'standalone'`)
- **Backend**: Self-hosted Supabase via Docker Compose
- **CDN**: Cloudflare Tunnel (free SSL + DDoS + caching)
- **Monitoring**: Cloudflare Analytics (free)

### Why Self-Hosted?

1. **Cost Predictability**: Fixed $5-20/month regardless of traffic
2. **Infrastructure Unity**: Frontend + backend on same VPS or separate
3. **Learning Value**: Full DevOps control and production experience
4. **Cloudflare Benefits**: Free unlimited bandwidth + CDN + DDoS protection
5. **No Vendor Lock-In**: Complete portability and control

**Cloudflare replaces Vercel's edge network** - provides SSL, CDN, caching, and DDoS protection for free.

### Deployment Checklist

Before deploying to production:

- [ ] Update `NEXT_PUBLIC_SUPABASE_URL` to production backend
- [ ] Replace test Turnstile captcha key with production key
- [ ] Set `NODE_ENV=production`
- [ ] Configure Cloudflare Tunnel for domain (`critiqit.io`)
- [ ] Verify all authentication flows work end-to-end
- [ ] Test rate limiting with real requests
- [ ] Check mobile responsiveness on real devices
- [ ] Verify dark mode in production build
- [ ] Configure monitoring and error tracking
- [ ] Set up automated backups for database

### Resource Requirements

**Minimum** (1000 concurrent users):
- 2GB RAM
- 2 CPU cores
- 20GB disk space

**Recommended** (10,000 concurrent users):
- 4GB RAM
- 4 CPU cores
- 40GB disk space

**Scaling**: Horizontal with load balancer when exceeding 10k users

### Cloudflare Tunnel Setup

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create critiqit

# Configure tunnel (~/.cloudflared/config.yml)
tunnel: <tunnel-id>
credentials-file: /path/to/<tunnel-id>.json

ingress:
  - hostname: critiqit.io
    service: http://localhost:3000
  - hostname: api.critiqit.io
    service: http://localhost:8000
  - service: http_status:404

# Run tunnel
cloudflared tunnel run critiqit
```

### Alternative: Cloudflare Pages

If you prefer serverless:
- **Free tier**: Unlimited bandwidth
- **Setup**: Use `@cloudflare/next-on-pages` adapter
- **Limitations**: Some Next.js features need workarounds (ISR, Middleware)
- **Cost**: $0/month (free tier) or $20/month (pro features)

### Continuous Deployment

**Simple Git-Based Deployment:**
```bash
#!/bin/bash
# deploy.sh
git pull origin main
cd supabase
docker compose up -d --build
```

Or use GitHub Actions for automated deployments (see `.github/workflows/` when available).

### Monitoring

- **Cloudflare Analytics**: Traffic, requests, bandwidth (free)
- **Docker Logs**: `docker logs critiqit-frontend -f`
- **Health Checks**: Built into Docker containers
- **Optional**: Grafana + Prometheus for detailed metrics

For detailed deployment instructions, see [Frontend Documentation](.context/frontend.md#deployment).

---

## 🎯 Roadmap

### Phase 1: Core Rating System ✅ (Complete)
- [ ] Simple star ratings (0-10)
- [ ] Movie/show data structure
- [x] User authentication
- [x] Basic profile pages

### Phase 2: Detailed Ratings 🚧 (In Progress)
- [ ] Category breakdown with sliders
- [ ] Template system (use existing templates)
- [ ] Weighted score calculation
- [ ] Rating history

### Phase 3: Social Features 📅 (Planned)
- [ ] Follow/followers system
- [ ] Activity feed
- [ ] Comments on ratings
- [ ] Like system
- [ ] Friend ratings display

### Phase 4: Advanced Features 📅 (Planned)
- [ ] Create custom templates
- [ ] Hierarchical TV show ratings (seasons/episodes)
- [ ] Collection management
- [ ] Stats dashboard with charts
- [ ] Badge system

### Phase 5: Extensibility 📅 (Future)
- [ ] Music albums support
- [ ] Books support
- [ ] Recipes support
- [ ] User-generated item types

---

## 📖 Documentation

- **[Design System](.context/design-system.md)** - Complete design specifications
- **[Frontend Patterns](.context/frontend.md)** - Next.js patterns and conventions
- **[Backend Patterns](.context/backend.md)** - Supabase patterns and RLS examples
- **[Project Context](.context/CLAUDE.md)** - Current state and priorities
- **[Session History](.context/sessions.md)** - Development history and lessons learned

---

## 🤝 Contributing

CritiQit is currently in active development. Contributions are welcome!

### Development Standards

- **Security First**: All code must pass security audit
- **Accessibility**: WCAG AA minimum, AAA preferred
- **Type Safety**: No `any` types in TypeScript
- **Design System**: Follow `.context/design-system.md` strictly
- **Testing**: Test edge cases, malicious inputs, error states
- **Documentation**: Update context files with lessons learned

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Amazing open-source backend
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) - Accessible components

---

**Built with ❤️ for movie lovers, data nerds, and everyone in between.**
