# CritiQit Frontend Documentation

This file documents the Next.js frontend architecture, patterns, components, and conventions.

---

## Overview

CritiQit's frontend is built with Next.js 15 using the App Router architecture. It's structured as a yarn workspace within the monorepo and communicates with the self-hosted Supabase backend.

**Tech Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS + tailwindcss-animate
- Radix UI components
- Supabase client libraries

---

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── auth/                    # Authentication pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   ├── update-password/
│   │   ├── verify-email/
│   │   ├── verify-reset/
│   │   ├── callback/           # OAuth callback
│   │   └── error/              # Auth error page
│   └── protected/              # Protected routes
│       ├── layout.tsx          # Protected layout
│       ├── dashboard/
│       └── profile/
├── components/                  # React components
│   ├── auth/                   # Auth-related components
│   │   ├── login-form.tsx
│   │   ├── sign-up-form.tsx
│   │   ├── profile-form.tsx
│   │   ├── oauth-panel.tsx
│   │   └── ...
│   ├── ui/                     # Shadcn/Radix UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── avatar.tsx
│   │   └── ...
│   ├── nav.tsx                 # Navigation component
│   ├── footer.tsx
│   ├── hero.tsx
│   └── current-user-avatar.tsx
├── lib/                        # Utilities and helpers
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Auth middleware
│   ├── auth/
│   │   ├── user.ts            # User type and mapper
│   │   └── get-current-user.ts
│   ├── utils.ts               # General utilities (cn, etc.)
│   └── form-state.ts          # Form state types
├── providers/
│   └── current-user-provider.tsx  # User context provider
├── styles/
│   └── globals.css            # Global styles
└── middleware.ts              # Next.js middleware
```

---

## Routing

### App Router Structure

CritiQit uses Next.js 15's App Router with the following route organization:

**Public Routes:**
- `/` - Home page
- `/auth/login` - Login page
- `/auth/sign-up` - Sign up page
- `/auth/forgot-password` - Password reset request
- `/auth/verify-email` - Email verification
- `/auth/verify-reset` - Reset code verification
- `/auth/update-password` - Password update after reset
- `/auth/callback` - OAuth callback handler
- `/auth/error` - Auth error handler

**Protected Routes:**
- `/protected/*` - All routes under this require authentication
- `/protected/dashboard` - User dashboard
- `/protected/profile` - User profile page

### Protected Route Pattern

The `/protected` directory uses a layout that ensures authentication:

```tsx
// app/protected/layout.tsx
// This layout wraps all protected routes and redirects if not authenticated
```

---

## Supabase Integration

### Client Types

**Browser Client** (`lib/supabase/client.ts`):
```typescript
import { createClient } from "@/lib/supabase/client";

// Use in Client Components
const supabase = createClient();
```

**Server Client** (`lib/supabase/server.ts`):
```typescript
import { createClient } from "@/lib/supabase/server";

// Use in Server Components and Server Actions
const supabase = await createClient();
```

**Important**: Always create a new server client per request. Never store in a global variable (Vercel Fluid compute requirement).

### Middleware

Authentication middleware (`lib/supabase/middleware.ts`) runs on every request to:
- Refresh user session
- Manage auth cookies
- Handle redirects for protected routes

---

## Authentication

### User Context Provider

The `CurrentUserProvider` (`providers/current-user-provider.tsx`) manages global user state:

**Features:**
- Deduplicates overlapping refresh requests
- Syncs on specific auth events only (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED)
- Refreshes when tab regains focus (handles stale tabs)
- Accepts initial user from server to avoid loading flash

**Usage:**
```tsx
import { useCurrentUser } from "@/providers/current-user-provider";

function Component() {
  const { user, isLoading, refreshUser } = useCurrentUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return <div>Hello {user.username}</div>;
}
```

### User Profile Type

```typescript
export interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  username: string;
  full_name: string | null;
  bio: string | null;
  created_at: string | null;
}
```

**Mapping Function:**
The `mapAuthUserToProfile` function combines JWT claims and profile data, falling back to metadata if profile data is missing.

### Auth Components

Located in `components/auth/`:
- **`login-form.tsx`** - Login with email/password
- **`sign-up-form.tsx`** - Registration form with Turnstile
- **`forgot-password-form.tsx`** - Password reset request
- **`verify-email-form.tsx`** - Email verification code entry
- **`verify-reset-form.tsx`** - Password reset code entry
- **`update-password-form.tsx`** - New password entry
- **`profile-form.tsx`** - User profile editing
- **`oauth-panel.tsx`** - OAuth provider buttons
- **`logout-button.tsx`** - Logout functionality

### Security Features

**Cloudflare Turnstile:**
- Integrated via `@marsidev/react-turnstile`
- Protects signup and login forms
- Verified server-side via Supabase Edge Function

**Current Implementation:**
- Using test site key (visible in forms)
- Must switch to production key before launch

---

## Styling

### Tailwind CSS

**Configuration:**
- Custom theme with CSS variables for colors
- Dark mode support via `next-themes`
- Animation utilities via `tailwindcss-animate`
- Custom utilities in `globals.css`

**Utilities:**
```typescript
import { cn } from "@/lib/utils";

// Merge Tailwind classes with proper precedence
<div className={cn("base-class", conditionalClass && "conditional")} />
```

### UI Components

Using shadcn/ui pattern with Radix UI primitives:
- Components in `components/ui/`
- Based on Radix UI for accessibility
- Styled with Tailwind using CSS variables
- Support light/dark themes

**Common Components:**
- `Button` - Button variants (default, destructive, outline, ghost)
- `Input` - Text input with validation states
- `Label` - Form labels
- `Avatar` - User avatars with fallback
- `Card` - Content cards
- `DropdownMenu` - Dropdown menus
- `Checkbox` - Checkboxes

### Theme Switching

```tsx
import { ThemeSwitcher } from "@/components/auth/theme-switcher";

// Toggles between light/dark modes
<ThemeSwitcher />
```

---

## State Management

### Current Pattern

**User State**: Managed via `CurrentUserProvider` context
- Global user authentication state
- Automatically syncs with Supabase auth events
- Provides `refreshUser` for manual updates

**Form State**: Local component state with React hooks
- Server actions return structured errors
- Form components handle loading/error states
- Type-safe form state with TypeScript

**No Global State Library**: Not needed yet. Using React context + server state.

---

## Server Actions Pattern

Example from auth forms:

```typescript
"use server";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/protected/dashboard");
}
```

**Pattern:**
- Server actions in separate files or inline
- Use server client (`lib/supabase/server.ts`)
- Return error objects or redirect on success
- Type-safe with TypeScript

---

## Component Patterns

### Client vs Server Components

**Server Components (default):**
- Fetch data directly
- Reduce client bundle size
- Cannot use hooks or browser APIs

**Client Components ('use client'):**
- Use React hooks
- Handle interactivity
- Access browser APIs
- Subscribe to context

**Rule of Thumb**: Use server components by default, add 'use client' only when needed.

### Form Components

**Pattern:**
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MyForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await serverAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/success");
  }

  return (
    <form action={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### Avatar Upload Pattern

From `profile-form.tsx`:
- Client-side image preview
- Resize/crop before upload (optional)
- Upload to Supabase Storage
- Update profile with new URL
- Cache busting with version parameter

---

## Environment Variables

Located in `frontend/.env.local` (not committed):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_TURNSTILE_SITE_KEY=test_key_or_production_key
```

**Prefixes:**
- `NEXT_PUBLIC_*` - Exposed to browser (public)
- No prefix - Server-only (private)

---

## Development

### Running Locally

```bash
cd frontend
yarn install
yarn dev
```

Runs on `http://localhost:3001` (port 3001 to avoid conflicts)

### Turbopack

Development server uses Turbopack (`--turbopack` flag in dev script):
- Faster cold starts
- Faster HMR (Hot Module Replacement)
- Next.js 15+ default

### Building for Production

```bash
yarn build
yarn start
```

---

## Key Patterns & Conventions

### Import Aliases

```typescript
import Component from "@/components/component";
import { utility } from "@/lib/utils";
```

`@/` maps to `frontend/` root (configured in `tsconfig.json`)

### File Naming

- Components: `kebab-case.tsx` (e.g., `user-profile.tsx`)
- Pages: `page.tsx` (App Router convention)
- Layouts: `layout.tsx` (App Router convention)
- Utilities: `kebab-case.ts`

### Component Structure

```tsx
// 1. Imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Component
export function MyComponent({ title }: Props) {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Handlers
  function handleClick() {
    // ...
  }

  // 6. JSX
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### Error Handling

**Server Actions:**
```typescript
if (error) {
  return { error: error.message };
}
```

**Client Components:**
```typescript
if (result?.error) {
  setError(result.error);
  return;
}
```

---

## Performance Considerations

### Image Optimization

- Use Next.js `<Image />` component
- Lazy load images below fold
- Set proper width/height to avoid layout shift

### Code Splitting

- Automatic with App Router
- Dynamic imports for large components:
  ```typescript
  const HeavyComponent = dynamic(() => import("./heavy-component"));
  ```

### Bundle Size

- Check with: `yarn build`
- Monitor First Load JS
- Keep client components minimal

---

## Known Issues & Gotchas

### User Provider Deduplication

The `CurrentUserProvider` uses a ref-based promise cache to prevent duplicate requests when multiple components trigger a refresh simultaneously.

### Auth State Sync

Only syncs on specific events (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED) to avoid unnecessary refreshes. Other events like PASSWORD_RECOVERY are ignored unless they affect user data.

### Server Component Cookies

Server components can read cookies but cannot set them. Cookie setting happens in middleware or via server actions with redirects.

### OAuth Callback Timing

OAuth callbacks may take a moment to process. The callback page should show a loading state and redirect after session is established.

---

## Testing

**Current State**: No automated tests yet.

**Recommended Setup:**
- Unit tests: Vitest
- Component tests: React Testing Library
- E2E tests: Playwright

---

## Deployment

### Cost-Effective Self-Hosted Strategy

**Philosophy**: CritiQit uses self-hosted infrastructure for predictable, minimal costs while maintaining production-quality performance and security.

**Target Platform**: Self-hosted VPS (Hetzner, DigitalOcean, or same server as Supabase)

**Why Self-Hosted?**
- **Cost**: $5-20/month total vs $200-400/month on Vercel at scale
- **Predictability**: Fixed monthly cost regardless of traffic
- **Control**: Full access to logs, metrics, and configuration
- **Integration**: Colocation with self-hosted Supabase backend
- **Cloudflare Protection**: Free SSL, DDoS protection, and CDN via Cloudflare Tunnel

### Production Deployment Options

**Option 1: Docker Compose (Recommended)**

Uncomment the frontend service in `supabase/compose.yml`:

```bash
# Edit supabase/compose.yml, uncomment the frontend service section
cd supabase
docker compose up -d
```

Frontend runs on port 3000 alongside Supabase services.

**Option 2: Standalone Docker**

```bash
cd frontend
docker build -t critiqit-frontend .
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://api.critiqit.io \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_key \
  --name critiqit-frontend \
  critiqit-frontend
```

**Option 3: Direct Node.js**

```bash
cd frontend
yarn install --production
yarn build
yarn start  # Runs on port 3001 by default
```

### Build Configuration

**Next.js Config** (`next.config.ts`):
```typescript
output: 'standalone'  // Creates minimal production build in .next/standalone/
```

**Dockerfile**: Multi-stage build for minimal image size (~150MB final image)
- Stage 1: Install dependencies
- Stage 2: Build application
- Stage 3: Run production server (non-root user, security hardened)

**Image Optimization**: Next.js built-in optimization (no external service needed)

### Cloudflare Tunnel Setup

```bash
# Already configured for development, use same pattern for production
cloudflared tunnel --config ~/.cloudflared/critiqit.yml run
```

**Tunnel Config** (`~/.cloudflared/critiqit.yml`):
```yaml
url: http://localhost:3000
tunnel: <your-tunnel-id>
credentials-file: /path/to/credentials.json
```

Cloudflare automatically provides:
- SSL/TLS certificates
- DDoS protection
- CDN caching for static assets
- Web Application Firewall (WAF)
- Analytics

### Environment Variables

**Development** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=test_key
```

**Production** (Docker environment or system env):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.critiqit.io
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_anon_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=production_turnstile_key
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Security Notes**:
- `NEXT_PUBLIC_*` variables are embedded in client bundle (safe for public values)
- Never use `NEXT_PUBLIC_` prefix for sensitive keys (service_role, JWT secrets)
- Supabase ANON key is safe to expose (protected by RLS policies)

### Health Checks

The Docker container includes a health check:
```bash
curl http://localhost:3000/api/health
```

Returns 200 when application is healthy. Useful for:
- Docker health monitoring
- Load balancer health checks
- Uptime monitoring services

### Deployment Checklist

Before production deployment:

- [ ] Update `NEXT_PUBLIC_SUPABASE_URL` to production backend URL
- [ ] Replace test Turnstile key with production key
- [ ] Set `NODE_ENV=production`
- [ ] Verify Cloudflare Tunnel is configured for domain
- [ ] Test build locally: `yarn build && yarn start`
- [ ] Verify image optimization works
- [ ] Check bundle size: `yarn build` output
- [ ] Test on mobile devices (responsive design)
- [ ] Verify dark mode works correctly
- [ ] Test all authentication flows
- [ ] Verify rate limiting error handling (countdown timers)
- [ ] Check CSP headers and security policies
- [ ] Configure monitoring/alerting for errors

### Resource Requirements

**Minimum** (development/testing):
- 1GB RAM
- 1 CPU core
- 10GB disk space

**Recommended** (production):
- 2GB RAM (handles 1000+ concurrent users)
- 2 CPU cores
- 20GB disk space (includes logs, caching)

**At Scale** (10,000+ concurrent users):
- 4GB RAM
- 4 CPU cores
- Consider horizontal scaling with load balancer

### Cost Analysis

**Self-Hosted Stack** (CritiQit's Choice):
- Hetzner VPS (2GB RAM): €4.15/month (~$4.50)
- Cloudflare Tunnel: Free
- Cloudflare CDN: Free (unlimited bandwidth!)
- **Total: ~$5-10/month** for complete stack

**Alternative: Vercel**:
- Free tier: 100GB bandwidth (covers ~10k visitors)
- Pro tier: $20/month for 1TB bandwidth
- Bandwidth overage: $40 per 100GB
- **At 1M visitors: $200-400/month**

**Alternative: Cloudflare Pages**:
- Free tier: Unlimited bandwidth (!)
- Pro: $20/month (advanced features only)
- Works with Next.js via `@cloudflare/next-on-pages`
- **Good free option if self-hosting not desired**

### Performance Optimization

**Cloudflare Caching**:
```typescript
// Public assets cached automatically
// API routes bypass cache (dynamic content)
```

**Next.js Built-in**:
- Automatic code splitting
- Image optimization
- Font optimization
- Static generation where possible

**Monitoring**:
- Cloudflare Analytics (free)
- Docker logs: `docker logs critiqit-frontend`
- Optional: Grafana + Prometheus for detailed metrics

### Continuous Deployment

**Simple Git-Based Pattern**:
```bash
#!/bin/bash
# deploy.sh
git pull origin main
cd frontend
docker build -t critiqit-frontend .
docker stop critiqit-frontend || true
docker rm critiqit-frontend || true
docker run -d -p 3000:3000 \
  --env-file .env.production \
  --name critiqit-frontend \
  critiqit-frontend
```

**Or with Docker Compose**:
```bash
cd supabase
git pull origin main
docker compose up -d --build frontend
```

### Why NOT Vercel?

While Vercel is excellent for Next.js, CritiQit prioritizes:

1. **Cost Predictability**: Fixed $5-10/month vs unpredictable bandwidth costs
2. **Infrastructure Unity**: Colocation with self-hosted Supabase backend
3. **Learning Value**: Full control teaches DevOps and production patterns
4. **Cloudflare Benefits**: Free CDN + DDoS protection replaces Vercel's edge network
5. **Professional Experience**: Self-hosting is valuable skill for engineering career

Vercel makes sense for:
- Rapid prototyping without DevOps
- Teams without infrastructure expertise
- Projects needing serverless functions at scale
- Businesses prioritizing time-to-market over cost optimization

---

## Error Handling Patterns

### Edge Function Error Handling Pattern

#### Critical Difference from Direct Auth Calls

Edge Functions in Supabase return errors through `FunctionsHttpError` with a different structure than direct auth calls.

**Direct Auth Calls (signUp, signInWithPassword, etc.):**
```typescript
const { error } = await supabase.auth.signUp({ email, password });
if (error) {
  console.log(error.message);  // String message
  console.log(error.status);   // HTTP status code
}
```

**Edge Function Calls (functions.invoke):**
```typescript
const { error } = await supabase.functions.invoke("my-function", { body: data });
if (error) {
  // error is a FunctionsHttpError
  const errorData = await error.context.json();  // MUST parse context!
  console.log(errorData.message);
  console.log(error.context.status);  // HTTP status from context
}
```

### Rate Limiting Error Format

When rate limits are exceeded (429 status), both patterns receive:

```json
{
  "message": "Rate limit exceeded",
  "identifier_type": "email",
  "limit_hit": "hour",
  "retry_after": 60
}
```

### Parsing Utilities

Use the provided parsing functions from `@/lib/parse-auth-error`:

- `parseAuthError(error)` - For direct Supabase auth calls (synchronous)
- `parseEdgeFunctionError(error)` - For Edge Function calls (asynchronous!)

### Example: OTP Verification (Edge Function)

```typescript
import { parseEdgeFunctionError } from "@/lib/parse-auth-error";

const { data, error } = await supabase.functions.invoke("verify-otp-securely", {
  body: { req_type: "signup", email, token, captchaToken },
});

if (error) {
  // IMPORTANT: Must use async parser for Edge Functions!
  const parsedError = await parseEdgeFunctionError(error);

  if (isRateLimitError(parsedError)) {
    // Show countdown timer, disable form
    console.log(`Retry in ${parsedError.retry_after} seconds`);
  } else {
    // Show normal error message
    console.log(parsedError);
  }

  return {
    status: "error",
    error: parsedError,
  };
}
```

### Example: Login (Direct Auth Call)

```typescript
import { parseAuthError } from "@/lib/parse-auth-error";

const { error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  // Synchronous parser for direct calls
  const parsedError = parseAuthError(error);

  if (isRateLimitError(parsedError)) {
    // Show countdown timer, disable form
  } else {
    // Show normal error message
  }

  setError(parsedError);
}
```

### FormError Component

The `FormError` component (`@/components/ui/form-error`) automatically:
- Detects rate limit errors using the `isRateLimitError` type guard
- Shows countdown timer for rate limit errors
- Styles appropriately (yellow warning for rate limits, red for errors)
- Supports dark mode
- Updates countdown every second

**Usage:**
```typescript
import { FormError } from "@/components/ui/form-error";
import { isRateLimitError } from "@/lib/form-state";

const [error, setError] = useState<string | RateLimitError | null>(null);
const isRateLimited = isRateLimitError(error);

// In JSX:
<FormError error={error} />
<Button disabled={isLoading || isRateLimited}>Submit</Button>
```

### Type Definitions

```typescript
// From @/lib/form-state
export type RateLimitError = {
  message: string;
  type: "rate_limit";
  retry_after: number;      // seconds until retry allowed
  limit_hit: string;        // "hour" | "minute" | "day"
  identifier_type: string;  // "email" | "ip" | "user"
};

export function isRateLimitError(error: string | RateLimitError | undefined): error is RateLimitError {
  return typeof error === "object" && error !== null && error.type === "rate_limit";
}
```

### Best Practices

1. **Always disable form buttons when rate limited** to prevent users from making the problem worse
2. **Use FormError component** for consistent error display across all forms
3. **Parse Edge Function errors asynchronously** - `parseEdgeFunctionError` is async!
4. **Parse direct auth errors synchronously** - `parseAuthError` is sync
5. **Test dark mode** - rate limit warnings should display correctly in both themes
6. **Handle countdown completion** - FormError shows "You can try again now" when countdown reaches zero

---

## Related Documentation

- **Project overview**: [project.md](./project.md)
- **Backend details**: [backend.md](./backend.md)
- **Session history**: [sessions.md](./sessions.md)