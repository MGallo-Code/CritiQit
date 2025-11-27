# CritiQit Frontend Documentation

> **Last Updated**: 2025-11-27
> **Architecture**: Next.js 15 App Router + React 19
> **Purpose**: Essential frontend reference for AI agents

---

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS** + tailwindcss-animate
- **Radix UI** components (shadcn/ui pattern)
- **Supabase** client libraries

---

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── auth/                    # Public auth pages
│   └── protected/               # Protected routes (require auth)
├── components/
│   ├── auth/                    # Auth forms
│   └── ui/                      # Radix UI components (shadcn pattern)
├── lib/
│   ├── supabase/               # Client (browser), server, middleware
│   ├── auth/                   # User types, mappers
│   └── utils.ts                # Utilities (cn, etc.)
├── providers/
│   └── current-user-provider.tsx  # User context
├── styles/
│   └── globals.css             # Global styles + design tokens
└── middleware.ts               # Auth middleware
```

---

## Routing

**Public:** `/`, `/auth/login`, `/auth/sign-up`, `/auth/*` (forgot-password, verify-email, callback, etc.)

**Protected:** `/protected/*` - All routes require authentication (layout checks auth, redirects if needed)

---

## Architecture Constraints

### ⚠️ Realtime is DISABLED

**CritiQit does NOT use Supabase Realtime (WebSocket subscriptions).**

**Why:**
- Not needed for CritiQit's use case
- Reduces resource usage, battery drain, and complexity
- Simplifies infrastructure (one less service to maintain)

**Impact on Frontend Development:**

1. **Auth State Changes:**
   - `supabase.auth.onAuthStateChange()` still works (it's local to the client, not realtime)
   - BUT it won't fire automatically when user logs out, updates profile, etc.
   - **Solution:** Manually call `refreshUser()` from `CurrentUserProvider` after auth operations
   - Example: After `signOut()`, call `refreshUser()` to clear the user from provider

2. **Profile Updates:**
   - Changes in other tabs/windows won't auto-sync
   - **Solution:** `CurrentUserProvider` syncs on tab visibility change (when user switches back to tab)
   - Works for most use cases without realtime overhead

3. **Data Subscriptions:**
   - ❌ **NEVER use** `supabase.channel().on('postgres_changes', ...)` - it won't work
   - ❌ **NEVER use** `.subscribe()` for real-time updates
   - ✅ **DO use** polling, manual refresh, or visibility-based refresh patterns
   - ✅ **DO use** optimistic UI updates for immediate feedback

**Example - Correct Logout Pattern:**
```tsx
const { refreshUser } = useCurrentUser();

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    await refreshUser(); // Manually refresh to clear user
    router.push('/auth/login');
  }
};
```

**Example - Correct Profile Update Pattern:**
```tsx
// Optimistic update
setUser({ ...user, username: newUsername });

// Update backend
const { error } = await updateProfile({ username: newUsername });

if (error) {
  // Revert on error
  await refreshUser();
} else {
  // Sync to get latest data
  await refreshUser();
}
```

---

## Supabase Integration

**Browser Client** (`lib/supabase/client.ts`):
```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();  // Use in Client Components
```

**Server Client** (`lib/supabase/server.ts`):
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();  // Use in Server Components/Actions
```

**⚠️ CRITICAL**: Always create new server client per request. Never store in global variable.

**Middleware** (`lib/supabase/middleware.ts`): Refreshes session, manages cookies, handles redirects

---

## Authentication

### User Context Provider

`CurrentUserProvider` (`providers/current-user-provider.tsx`):
- Deduplicates refresh requests (ref-based promise cache)
- Syncs on visibility change (tab focus)
- Accepts initial user from server (avoids loading flash)

**Usage:**
```tsx
import { useCurrentUser } from "@/providers/current-user-provider";

const { user, isLoading, refreshUser } = useCurrentUser();
```

### User Profile Type

```typescript
interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  username: string;
  full_name: string | null;
  bio: string | null;
  created_at: string | null;
}
```

**Mapping:** `mapAuthUserToProfile()` combines JWT claims + profile data, falls back to metadata

### Auth Components

Located in `components/auth/`:
- `login-form.tsx`, `sign-up-form.tsx` (with Turnstile)
- `forgot-password-form.tsx`, `verify-email-form.tsx`, `verify-reset-form.tsx`, `update-password-form.tsx`
- `profile-form.tsx`, `oauth-panel.tsx`, `logout-button.tsx`

**Security:** Cloudflare Turnstile on signup/login (server-side verified via Edge Function)

---

## Styling

**📚 See [design-system.md](./design-system.md) for complete styling reference**

**Implementation:**
- **Tailwind CSS** with custom design tokens (movie theater theme)
- **Shadcn/ui pattern** with Radix UI primitives in `components/ui/`
- **Dark mode** via `next-themes` + `ThemeSwitcher` component

**Key Components:**
- `Button`, `Input`, `Label`, `Avatar`, `Card`, `DropdownMenu`, `Checkbox`
- `OTPInput` (6-digit verification with golden focus)
- `FormError` (rate limit countdown timer support)

**Key Utilities:** (See design-system.md for full specifications)
- `.bg-curtain-folds` - Royal red theater curtain background
- `.link-gold` - Star-yellow links (11.07:1 contrast, WCAG AAA)
- Global focus outline system (golden, theme-aware)

---

## State Management

- **User State**: `CurrentUserProvider` context (global auth)
- **Form State**: Local component state with React hooks
- **No global state library** needed yet (React context + server state sufficient)

---

## Server Actions Pattern

```typescript
"use server";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect("/protected/dashboard");
}
```

**Pattern:** Use server client, return error objects or redirect on success, type-safe

---

## Component Patterns

### Client vs Server Components

**Server Components (default):**
- Fetch data directly
- Reduce bundle size
- No hooks/browser APIs

**Client Components ('use client'):**
- Use hooks
- Handle interactivity
- Browser APIs
- Subscribe to context

**Rule:** Server components by default, add 'use client' only when needed

### Form Components

```tsx
"use client";
import { useState } from "react";

export function MyForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return <form action={handleSubmit}>{/* fields */}</form>;
}
```

### CRITICAL: Avatar Upload Pattern

**Image Compression Settings:**
```typescript
import imageCompression from "browser-image-compression";

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: false,  // ⚠️ CRITICAL: Prevents crashes with Safari HEIC conversions
};

const compressedFile = await imageCompression(file, options);
```

**Why `useWebWorker: false`?**
- Safari auto-converts HEIC → JPEG when selecting from photo library
- Converted JPEGs crash Web Worker processing
- Main thread slower but significantly more stable
- Prevents iOS "This webpage was reloaded" crashes

**Upload Pattern:**
```typescript
// ❌ WRONG - Race condition (data loss if upload fails after delete)
await supabase.storage.from('avatars').remove([path]);
await supabase.storage.from('avatars').upload(path, file);

// ✅ CORRECT - Atomic upsert (replaces only on success)
await supabase.storage.from('avatars').upload(path, file, { upsert: true });
```

**Cache Busting:**
```typescript
const url = `${avatarUrl}?version=${Date.now()}`;  // Force refresh after upload
```

### Dynamic Avatar Gradient Pattern

Extracts dominant color from avatar using Canvas API for personalized profile headers:

```typescript
const img = new Image();
img.crossOrigin = "anonymous";
img.src = avatarUrl;

img.onload = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 50;
  canvas.height = 50;
  ctx.drawImage(img, 0, 0, 50, 50);

  const pixel = ctx.getImageData(25, 25, 1, 1).data;  // Sample center
  const [r, g, b] = pixel;

  const hsl = rgbToHsl(r, g, b);
  hsl.l = Math.max(hsl.l, 0.6);  // Boost lightness

  setGradientColor(hslToString(hsl));
};

img.onerror = () => setGradientColor("hsl(355, 70%, 60%)");  // Fallback
```

**Features:** ~1ms sampling, 500ms CSS transitions, CORS-aware fallback

---

## Error Handling

### CRITICAL: Edge Function vs Direct Auth Error Parsing

**Direct Auth Calls (signUp, signInWithPassword):**
```typescript
import { parseAuthError } from "@/lib/parse-auth-error";

const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  const parsedError = parseAuthError(error);  // Synchronous
  setError(parsedError);
}
```

**Edge Function Calls (functions.invoke):**
```typescript
import { parseEdgeFunctionError } from "@/lib/parse-auth-error";

const { error } = await supabase.functions.invoke("verify-otp-securely", { body });
if (error) {
  const parsedError = await parseEdgeFunctionError(error);  // ⚠️ ASYNC!
  setError(parsedError);
}
```

### Rate Limiting

**429 Response Format:**
```json
{
  "message": "Rate limit exceeded",
  "identifier_type": "email",
  "limit_hit": "hour",
  "retry_after": 60
}
```

**Type:**
```typescript
export type RateLimitError = {
  message: string;
  type: "rate_limit";
  retry_after: number;      // seconds
  limit_hit: string;        // "hour" | "minute" | "day"
  identifier_type: string;  // "email" | "ip" | "user"
};

export function isRateLimitError(error: unknown): error is RateLimitError {
  return typeof error === "object" && error !== null && error.type === "rate_limit";
}
```

**FormError Component:**

Automatically detects rate limits, shows countdown timer, disables form:

```tsx
import { FormError } from "@/components/ui/form-error";

const [error, setError] = useState<string | RateLimitError | null>(null);
const isRateLimited = isRateLimitError(error);

<FormError error={error} />
<Button disabled={isLoading || isRateLimited}>Submit</Button>
```

**Features:**
- Countdown timer updates every second
- Yellow warning styling for rate limits
- Red error styling for normal errors
- Dark mode support
- Shows "You can try again now" when countdown reaches zero

---

## Environment Variables

`frontend/.env.local` (not committed):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=test_key_or_production_key
```

**Prefixes:**
- `NEXT_PUBLIC_*` - Exposed to browser (public values only)
- No prefix - Server-only (private)

---

## Development

```bash
cd frontend
npm install
npm run dev  # Runs on localhost:3000 (avoids port conflicts)
```

**Turbopack:** Dev server uses `--turbopack` flag (faster HMR, Next.js 15+ default)

**Building:**
```bash
npm run build  # Check bundle size
npm start      # Production server
```

---

## Deployment

### Self-Hosted Strategy

**Philosophy:** Cost-effective self-hosting ($5-20/month) vs Vercel ($200-400/month at scale)

**Options:**
1. **Docker Compose** (Recommended) - Uncomment frontend in `supabase/compose.yml`
2. **Standalone Docker** - `docker build -t critiqit-frontend .`
3. **Direct Node.js** - `npm run build && npm start`

**Build Config:**
```typescript
// next.config.ts
output: 'standalone'  // Minimal production build in .next/standalone/
```

**Cloudflare Tunnel:**
- Free SSL + DDoS + CDN + WAF
- Replaces Vercel edge network at $0/month
- Routes: `critiqit.io` → `localhost:3000`

**Production Env:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.critiqit.io
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=production_key
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Resources:**
- Min: 1GB RAM, 1 CPU (dev/testing)
- Recommended: 2GB RAM, 2 CPU (1000+ concurrent users)
- Scale: 4GB RAM, 4 CPU (10,000+ concurrent users)

**Cost Analysis:**
- Self-hosted: $5-10/month (Hetzner VPS + free Cloudflare)
- Vercel: $200-400/month at 1M visitors (bandwidth overages)
- Cloudflare Pages: Free (unlimited bandwidth, but requires `@cloudflare/next-on-pages`)

---

## Conventions

**Import Aliases:**
```typescript
import Component from "@/components/component";  // @/ = frontend/ root
```

**File Naming:**
- Components: `kebab-case.tsx`
- Pages: `page.tsx` (App Router)
- Layouts: `layout.tsx`

**Component Structure:**
```tsx
// 1. Imports
// 2. Types/Interfaces
// 3. Component function
//    4. Hooks
//    5. Handlers
//    6. JSX return
```

---

## Performance

**Image Optimization:** Use `<Image />` component (Next.js built-in, works self-hosted)

**Code Splitting:** Automatic with App Router, or:
```typescript
const Heavy = dynamic(() => import("./heavy"));
```

**Bundle Size:** Check with `npm run build`, monitor First Load JS

---

## Known Issues

**User Provider Deduplication:** Ref-based promise cache prevents duplicate refresh requests

**Auth Sync:** Only syncs on SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED (avoids unnecessary refreshes)

**Server Component Cookies:** Can read but not set (cookie setting in middleware or server actions)

**OAuth Timing:** Callbacks may take a moment, show loading state

---

## Related Documentation

- [project.md](./project.md) - Project overview
- [backend.md](./backend.md) - Backend details
- [sessions.md](./sessions.md) - Session history
