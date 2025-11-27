# CritiQit Design System

**Last Updated:** 2025-11-27

> **Philosophy**: Professional + warm, minimalist with depth. Like Letterboxd's elegance meets a cozy community. Dark mode primary. Accessible to everyone, from casual users to data nerds.

---

## 🎨 Brand Identity

**Core Values:**
- **Accessible**: Everyone can rate, from critics to casual viewers
- **Flexible**: Simple stars or deep category analysis - user's choice
- **Social**: Share ratings, discover through friends, build community
- **Extensible**: Movies today, music/books/recipes tomorrow

**Target Audience:**
- Film critics who want detailed breakdowns
- Casual movie watchers tracking favorites
- Data nerds analyzing trends
- Social users discovering through friends

**Tone:** Professional yet inviting, data-rich yet not overwhelming

---

## 🎨 Color System

### Dark Mode (Primary)

**Background Tiers:**
```css
--background-primary: hsl(240 10% 8%)      /* #13141a - Main app background */
--background-secondary: hsl(240 8% 12%)    /* #1a1c24 - Cards, containers */
--background-tertiary: hsl(240 6% 16%)     /* #26282e - Elevated elements */
--background-hover: hsl(240 5% 20%)        /* #31343a - Hover states */
```

**Warm Accent Colors (Community/Social):**
```css
--warm-red: hsl(355 70% 45%)              /* #b32d3b - Deep red (movie theater curtains) */
--warm-red-light: hsl(355 65% 55%)        /* #c94754 - Lighter red for hover */
--warm-red-dark: hsl(355 75% 35%)         /* #8f232e - Darker red for active */
--warm-red-muted: hsl(355 30% 30%)        /* #623239 - Muted red for subtle elements */

--star-yellow: hsl(45 85% 75%)            /* #f5dc8e - Pastel yellow for stars */
--star-yellow-bright: hsl(45 90% 65%)     /* #f0ca5a - Brighter yellow for hover */
--star-yellow-muted: hsl(45 40% 60%)      /* #b39d6b - Muted yellow for empty stars */
```

**Rating Score Colors:**
```css
--rating-excellent: hsl(140 60% 50%)      /* #33cc7a - Green (8.0+) */
--rating-good: hsl(140 50% 45%)           /* #39b36d - Good (6.5-7.9) */
--rating-average: hsl(45 90% 55%)         /* #f5c842 - Yellow (5.0-6.4) */
--rating-below: hsl(30 85% 50%)           /* #ed7a33 - Orange (3.5-4.9) */
--rating-poor: hsl(0 70% 55%)             /* #db4747 - Red (0-3.4) */
```

**Functional Colors:**
```css
--primary: var(--warm-red)                /* Deep red for primary actions */
--primary-hover: var(--warm-red-light)    /* Lighter red for hover */
--primary-active: var(--warm-red-dark)    /* Darker red for active */
--success: hsl(140 60% 50%)               /* Green for confirmations */
--warning: hsl(45 85% 65%)                /* Pastel yellow for warnings */
--error: hsl(0 70% 55%)                   /* Bright red for errors */
--info: hsl(200 70% 55%)                  /* Cyan for information */
```

**Text Colors:**
```css
--text-primary: hsl(0 0% 95%)             /* Main text */
--text-secondary: hsl(0 0% 70%)           /* Secondary text */
--text-tertiary: hsl(0 0% 50%)            /* Muted text */
--text-disabled: hsl(0 0% 35%)            /* Disabled text */
--text-inverse: hsl(240 10% 8%)           /* Text on light backgrounds */
```

**Border & Divider:**
```css
--border-subtle: hsl(240 8% 20%)          /* Subtle borders */
--border-default: hsl(240 8% 25%)         /* Default borders */
--border-strong: hsl(240 8% 35%)          /* Strong borders */
```

### Light Mode (Secondary)

**Background Tiers:**
```css
--background-primary: hsl(0 0% 98%)       /* Off-white main background */
--background-secondary: hsl(0 0% 95%)     /* Light gray cards */
--background-tertiary: hsl(0 0% 92%)      /* Slightly darker elevated */
--background-hover: hsl(0 0% 88%)         /* Hover states */
```

**Adjust warm/rating colors for light mode:**
- Darken warm colors 10% for better contrast
- Rating colors remain vibrant but ensure 4.5:1 contrast ratio

---

## 📐 Spacing & Layout

### Spacing Scale
```css
--space-1: 0.25rem  /* 4px  - Tight spacing */
--space-2: 0.5rem   /* 8px  - Small gaps */
--space-3: 0.75rem  /* 12px - Default gap */
--space-4: 1rem     /* 16px - Standard spacing */
--space-5: 1.5rem   /* 24px - Medium spacing */
--space-6: 2rem     /* 32px - Large spacing */
--space-8: 3rem     /* 48px - Section spacing */
--space-10: 4rem    /* 64px - Major sections */
```

### Container Widths (Mobile-First)
```css
--container-mobile: 100%        /* Full width on mobile */
--container-tablet: 640px       /* Tablet breakpoint */
--container-desktop: 1024px     /* Desktop standard */
--container-wide: 1280px        /* Wide desktop */
--container-max: 1440px         /* Maximum width */
```

### Breakpoints
```css
/* Mobile-first approach */
@media (min-width: 640px)  { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Wide */ }
```

---

## 🔤 Typography

### Font Families
```css
--font-sans: ui-sans-serif, system-ui, sans-serif
--font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'Courier New', monospace
```

### Type Scale
```css
--text-xs: 0.75rem      /* 12px - Tiny labels */
--text-sm: 0.875rem     /* 14px - Small text */
--text-base: 1rem       /* 16px - Body text */
--text-lg: 1.125rem     /* 18px - Large body */
--text-xl: 1.25rem      /* 20px - Subheadings */
--text-2xl: 1.5rem      /* 24px - H3 */
--text-3xl: 1.875rem    /* 30px - H2 */
--text-4xl: 2.25rem     /* 36px - H1 */
--text-5xl: 3rem        /* 48px - Hero */
```

### Font Weights
```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

### Line Heights
```css
--leading-tight: 1.25    /* Headings */
--leading-normal: 1.5    /* Body text */
--leading-relaxed: 1.75  /* Comfortable reading */
```

### Typography Hierarchy

**H1 - Page Titles:**
```css
font-size: var(--text-4xl);
font-weight: var(--font-bold);
line-height: var(--leading-tight);
letter-spacing: -0.02em;
```

**H2 - Section Headings:**
```css
font-size: var(--text-3xl);
font-weight: var(--font-semibold);
line-height: var(--leading-tight);
```

**H3 - Subsections:**
```css
font-size: var(--text-2xl);
font-weight: var(--font-semibold);
line-height: var(--leading-normal);
```

**H4 - Card Titles:**
```css
font-size: var(--text-xl);
font-weight: var(--font-medium);
line-height: var(--leading-normal);
```

**Body:**
```css
font-size: var(--text-base);
font-weight: var(--font-normal);
line-height: var(--leading-normal);
```

**Small:**
```css
font-size: var(--text-sm);
color: var(--text-secondary);
```

**Monospace (Scores/Numbers):**
```css
font-family: var(--font-mono);
font-variant-numeric: tabular-nums;
```

---

## ⭐ Rating Display System

### Simple Rating Display

**Visual Format:**
```
⭐⭐⭐⭐½  8.5/10
(Stars in pastel yellow: hsl(45 85% 75%))
```

**Component Structure:**
- **Stars**: Visual, half-star precision (stored as decimal 0-10)
- **Numeric**: Displayed to 3 decimal places (e.g., 8.532/10)
- **Color-coded background** (subtle, not overwhelming):
  - 8.0+ → Green tint
  - 6.5-7.9 → Light green
  - 5.0-6.4 → Yellow tint
  - 3.5-4.9 → Orange tint
  - 0-3.4 → Red tint

**User vs. Community:**
```
Your Rating:     ⭐⭐⭐⭐½  8.5/10
Community Avg:   ⭐⭐⭐⭐   7.8/10  ↑0.7 (you rated higher)
```
- Small delta indicator: ↑ (higher), ↓ (lower), = (same)
- Muted color, not prominent

### Detailed Breakdown (Category Scores)

**Horizontal Bar Visualization:**
```
Story           ▓▓▓▓▓▓▓▓▓░  9.2/10  (40%)
Acting          ▓▓▓▓▓▓▓░░░  7.5/10  (30%)
Cinematography  ▓▓▓▓▓▓▓▓░░  8.0/10  (30%)
───────────────────────────────────
Weighted Score: ⭐⭐⭐⭐  8.3/10
```

**Bar Design:**
- Filled portion: Rating color (green/yellow/red)
- Empty portion: Muted gray
- Category name (left-aligned)
- Score (right-aligned, monospace)
- Weight percentage (optional, show on hover or in edit mode)

**Progressive Disclosure:**
- Default: Show weighted score + icon indicating "detailed rating available"
- Expand: Show full category breakdown
- Inline editing: Bars become sliders

### Hierarchical Scores (TV Shows)

**Expandable Tree Structure:**
```
📺 Breaking Bad                    ⭐⭐⭐⭐⭐  9.5/10 (Your Rating)
                                   ⭐⭐⭐⭐⭐  9.3/10 (Community)

  ▼ Season 1 (7 episodes)          ⭐⭐⭐⭐   8.7/10 [Calculated ⚙️]
     ├─ S1E1: Pilot                ⭐⭐⭐⭐   8.5/10
     ├─ S1E2: Cat's in the Bag     ⭐⭐⭐⭐   8.2/10
     └─ S1E3: ...And the Bag's...  ⭐⭐⭐⭐½  9.0/10

  ▼ Season 5 (16 episodes)         ⭐⭐⭐⭐⭐  9.8/10 [Calculated ⚙️]
     ├─ S5E14: Ozymandias          ⭐⭐⭐⭐⭐ 10.0/10
     └─ S5E16: Felina              ⭐⭐⭐⭐⭐  9.9/10
```

**Visual Indicators:**
- **Manual rating**: Full-color stars ⭐
- **Calculated average**: Muted gray stars with calculator icon ⚙️
- **Expandable sections**: Chevron icons ▼ ▶
- **Miniature indicators**: Small star count for episodes in collapsed view

**Collapsed Season View:**
```
▶ Season 1 (7 episodes)  ⭐⭐⭐⭐ 8.7/10 ⚙️  [5 rated, 2 unwatched]
```

---

## 🎴 Content Cards

### Movie/Show Card (Grid View)

**Mobile (Single Column):**
```
┌─────────────────────────────────┐
│                                 │
│         [Poster Image]          │
│         (Portrait 2:3)          │
│                                 │
├─────────────────────────────────┤
│ The Shawshank Redemption        │
│ ⭐⭐⭐⭐⭐ 9.2/10 (You)           │
│ ⭐⭐⭐⭐⭐ 9.3/10 (Community)     │
│                                 │
│ 1994 • 2h 22m • Drama           │
│ #Prison #Hope #Friendship       │
│                                 │
│ [Rate] [Add to Collection] [💬] │
└─────────────────────────────────┘
```

**Desktop (Multi-Column Grid):**
- 2-column on tablet (640px+)
- 3-column on desktop (1024px+)
- 4-column on wide (1280px+)

**Poster Behavior:**
- Hover: Slight scale (1.05x), shadow increase
- Click poster: Open detail modal
- Touch: Single tap opens detail

### Movie/Show Card (List View - Search Results)

**Mobile:**
```
┌──────────────────────────────────────────────┐
│ [Thumb]  The Shawshank Redemption            │
│ [100px]  ⭐⭐⭐⭐⭐ 9.2/10 • 1994 • 2h 22m    │
│          Drama • #Prison                     │
│          [Rate] [+Collection]                │
└──────────────────────────────────────────────┘
```

**Desktop:**
```
┌──────────────────────────────────────────────────────────────────┐
│ [Thumb] The Shawshank Redemption    1994  2h 22m  Drama          │
│ [80px]  ⭐⭐⭐⭐⭐ 9.2/10 (You)  ⭐⭐⭐⭐⭐ 9.3/10 (Community)      │
│         #Prison #Hope #Friendship                                │
│         [Rate] [Add to Collection] [Share]                       │
└──────────────────────────────────────────────────────────────────┘
```

### Collection Card

**Grid Layout:**
```
┌─────────────────────────────────┐
│ ┌───────┬───────┐               │
│ │[Post1]│[Post2]│               │
│ ├───────┼───────┤               │
│ │[Post3]│[Post4]│               │
│ └───────┴───────┘               │
├─────────────────────────────────┤
│ Sci-Fi Favorites                │
│ 24 movies • Avg: ⭐⭐⭐⭐ 8.2/10  │
│ #Action #Space #Future          │
│ 🔒 Private                      │
└─────────────────────────────────┘
```

**Single Poster Variant (Few Items):**
```
┌─────────────────────────────────┐
│                                 │
│      [Single Large Poster]      │
│                                 │
├─────────────────────────────────┤
│ Must Watch Before I Die         │
│ 3 movies • Not rated yet        │
│ 🌐 Public                       │
└─────────────────────────────────┘
```

### Empty States

**No Rating Yet:**
```
┌─────────────────────────────────┐
│                                 │
│            ⭐ ⭐ ⭐             │
│                                 │
│      Rate "The Godfather"       │
│                                 │
│   [Quick Rate: Tap Stars]       │
│   [Detailed Rating]             │
│                                 │
└─────────────────────────────────┘
```

**No Collections:**
```
┌─────────────────────────────────┐
│                                 │
│           📚                    │
│                                 │
│   No collections yet!           │
│   Start organizing your         │
│   favorite movies               │
│                                 │
│   [Create Collection]           │
│                                 │
└─────────────────────────────────┘
```

---

## 🎯 Rating Input Interactions

### Quick Rate (Simple)

**Desktop (Hover):**
- Hover over stars on card
- Stars fill on hover
- Click to save instantly
- Subtle success feedback (checkmark, brief green tint)

**Mobile (Touch):**
- Tap star to rate
- Half-star: Tap left side of star
- Full star: Tap right side of star
- Instant save on tap
- Haptic feedback on rate (if supported)

### Detailed Rate (Category Breakdown)

**Modal/Bottom Sheet:**
```
┌──────────────────────────────────────┐
│ Rate: The Shawshank Redemption       │
├──────────────────────────────────────┤
│                                      │
│ Overall Rating                       │
│ ⭐⭐⭐⭐½  8.5/10                      │
│                                      │
│ ─── Category Breakdown ───           │
│                                      │
│ Story                                │
│ [━━━━━━━━━━] 9.2/10  (40%)           │
│                                      │
│ Acting                               │
│ [━━━━━━━━░░] 7.5/10  (30%)           │
│                                      │
│ Cinematography                       │
│ [━━━━━━━━░░] 8.0/10  (30%)           │
│                                      │
│ ⚙️ Edit Template / Weights           │
│                                      │
│ ─── Notes (Optional) ───             │
│ [Text area for review]               │
│                                      │
│ 🌐 Public  🔒 Friends  🔐 Private    │
│                                      │
│ [Cancel]              [Save Rating]  │
└──────────────────────────────────────┘
```

**Category Sliders:**
- Drag to adjust score (0-10, 0.1 increments)
- Tap to jump to position
- Number input next to slider for precise entry
- Real-time weighted score calculation shown at top
- Color-coded bar (green/yellow/red)

**Weight Adjustment (Edit Template Mode):**
```
┌──────────────────────────────────────┐
│ Edit Template: Movie Critic          │
├──────────────────────────────────────┤
│                                      │
│ 📋 Categories (Drag to reorder)      │
│                                      │
│ ☰ Story                   40%        │
│   [━━━━━━━━━━━━] Adjust weight       │
│                                      │
│ ☰ Acting                  30%        │
│   [━━━━━━━━━━] Adjust weight         │
│                                      │
│ ☰ Cinematography          30%        │
│   [━━━━━━━━━] Adjust weight          │
│                                      │
│ [+ Add Category]                     │
│                                      │
│ Total: 100% ✓                        │
│                                      │
│ [Save Template]  [Save As New]       │
└──────────────────────────────────────┘
```

### Inline Edit (Existing Rating)

**On card hover/tap:**
- Stars become interactive
- Score updates live
- Save button appears
- Or auto-save on change (with undo option)

---

## 👤 Profile & Stats

### Public Profile Layout

**Header Section:**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Avatar]   @username                            │
│  [100px]    "The Harsh Critic" 🎬               │
│             Avg Rating: 6.8/10                   │
│             324 ratings • 12 collections         │
│                                                  │
│  [Follow] [Message] [Share]                      │
│                                                  │
│  🏆 Badges: [Early Adopter] [100 Club] [Social]  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Critic Title System (Based on avg rating + count):**
- 8.5+ avg, 200+ ratings: "The Eternal Optimist" 🌟
- 8.0-8.4 avg, 100+ ratings: "The Generous Critic" 😊
- 7.0-7.9 avg, 100+ ratings: "The Balanced Reviewer" ⚖️
- 6.0-6.9 avg, 100+ ratings: "The Discerning Eye" 👁️
- 5.0-5.9 avg, 100+ ratings: "The Harsh Critic" 🎬
- <5.0 avg, 100+ ratings: "The Unforgiving Judge" ⚡
- <50 ratings: "New Critic" 🌱
- 50-99 ratings: "Rising Critic" 📈
- 500+ ratings: "Veteran Critic" 🎖️
- 1000+ ratings: "Master Critic" 👑

**Badges:**
- **Activity**: Early Adopter, 100 Club, 500 Club, 1000 Club
- **Social**: Connector (50+ followers), Influencer (500+ followers), Commentator (100+ comments)
- **Diversity**: Genre Explorer (rated 10+ genres), Completionist (finished TV series)
- **Quality**: Detail Oriented (50+ detailed ratings), Prolific Reviewer (100+ written reviews)

**Stats Section:**
```
┌────────────────────────────────────────────────┐
│ ─── Stats at a Glance ───                     │
│                                                │
│ Total Watch Time:    284 hours                │
│ Most Active Genre:   Sci-Fi (98 ratings)      │
│ Top Rated:          The Godfather (10.0/10)   │
│ Latest Rating:      Dune (8.5/10, 2h ago)     │
│                                                │
│ ─── Rating Distribution ───                   │
│                                                │
│ 10★ ████████          (24)                    │
│ 9★  ████████████      (45)                    │
│ 8★  ███████████████   (87)                    │
│ 7★  ████████████      (96)                    │
│ 6★  ██████            (52)                    │
│ 5★  ████              (15)                    │
│ <5★ ██                (5)                     │
│                                                │
│ ─── Activity Heatmap ───                      │
│ [GitHub-style contribution grid]              │
│                                                │
└────────────────────────────────────────────────┘
```

**Tabs:**
- Overview (stats shown above)
- Ratings (grid/list of all rated items)
- Collections (user's collections)
- Activity (recent ratings, comments, likes)
- Friends (followers/following)

### Private Profile/Settings

**Settings Page:**
- Profile picture upload
- Username, display name, bio
- Privacy settings (public/friends/private for ratings)
- Notification preferences
- Account settings (email, password)

---

## 👥 Social Features

### Friend Ratings on Item Page

**Expandable Section:**
```
┌────────────────────────────────────────┐
│ ─── Friends' Ratings (8) ───           │
│                                        │
│ @alice     ⭐⭐⭐⭐⭐  9.5/10  💬 2      │
│ "Absolutely loved it!"                 │
│                                        │
│ @bob       ⭐⭐⭐⭐    7.8/10  💬 0      │
│                                        │
│ @charlie   ⭐⭐⭐      6.0/10  💬 5      │
│ "Overrated IMO"                        │
│                                        │
│ [See all 8 ratings]                    │
└────────────────────────────────────────┘
```

### Activity Feed

**Feed Item Examples:**
```
┌────────────────────────────────────────┐
│ @alice rated The Godfather             │
│ ⭐⭐⭐⭐⭐ 10.0/10 • 2 hours ago         │
│ [Poster] "A masterpiece"               │
│ ❤️ 12  💬 3                            │
│                                        │
│ @bob added 5 movies to "Must Watch"   │
│ [4 posters shown] • 1 day ago          │
│ ❤️ 5  💬 1                             │
│                                        │
│ @charlie followed you • 3 days ago     │
│ [Follow Back]                          │
└────────────────────────────────────────┘
```

### Comment System

**Comments on Ratings:**
```
┌────────────────────────────────────────┐
│ @alice's rating: ⭐⭐⭐⭐⭐ 9.5/10        │
│ "This movie changed my life"           │
│                                        │
│ ❤️ 24  💬 8  🔗 Share                  │
│                                        │
│ ─── Comments (8) ───                   │
│                                        │
│ @bob • 2h ago                          │
│ Totally agree! The ending was perfect  │
│ ❤️ 5  Reply                            │
│                                        │
│   └─ @alice • 1h ago                   │
│      Right?! Didn't see it coming      │
│      ❤️ 2                              │
│                                        │
│ @charlie • 5h ago                      │
│ I thought it was overrated tbh         │
│ ❤️ 1  Reply                            │
│                                        │
│ [Write a comment...]                   │
└────────────────────────────────────────┘
```

**Like/Dislike:**
- Show like count (❤️ 24)
- No dislike count shown (prevent negativity)
- Dislike tracked for algorithm but not displayed

---

## ♿ Accessibility Standards

### Color Contrast
- **WCAG AAA**: 7:1 ratio for body text
- **WCAG AA**: 4.5:1 ratio minimum for all text
- **Large text**: 3:1 ratio (18pt+)
- Test with colorblind simulators (protanopia, deuteranopia, tritanopia)

### Keyboard Navigation
```
Tab       → Next interactive element
Shift+Tab → Previous interactive element
Enter     → Activate button/link
Space     → Toggle checkbox, activate button
Arrows    → Navigate star rating, sliders
Esc       → Close modal/dropdown
```

### Screen Reader Support
```html
<!-- Rating display -->
<div role="img" aria-label="Rated 4.5 out of 5 stars">
  ⭐⭐⭐⭐½
</div>

<!-- Community comparison -->
<p aria-label="Your rating is 0.7 points higher than community average">
  ↑0.7
</p>

<!-- Category breakdown -->
<div role="region" aria-label="Category ratings">
  <div role="group">
    <label id="story-label">Story</label>
    <div role="slider"
         aria-labelledby="story-label"
         aria-valuemin="0"
         aria-valuemax="10"
         aria-valuenow="9.2"
         aria-valuetext="9.2 out of 10">
    </div>
  </div>
</div>
```

### Focus Indicators
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Loading States
- Skeleton screens for content loading
- Spinner for actions (save, submit)
- Progress bar for uploads (avatars, images)
- "Loading..." text for screen readers

### Alternative Text
```html
<!-- Poster images -->
<img src="poster.jpg" alt="The Shawshank Redemption movie poster" />

<!-- User avatars -->
<img src="avatar.jpg" alt="@alice's profile picture" />

<!-- Empty states -->
<img src="empty-collection.svg" alt="" role="presentation" />
<!-- Decorative, no alt needed -->
```

---

## 📱 Mobile-First Patterns

### Touch Targets
- Minimum: 44x44px (Apple HIG, Android: 48x48dp)
- Spacing between targets: 8px minimum
- Stars for rating: 48px each on mobile

### Gestures (Future Enhancement)
- Swipe right on card: Quick rate up (add 1 star)
- Swipe left on card: Skip to next
- Pull to refresh: Activity feed, search results
- Long press: Context menu (add to collection, share)

### Bottom Sheet (Mobile Detail View)
```
Mobile device screen:
┌────────────────────┐
│ [App Content]      │
│                    │
│                    │ ← Tap card
│                    │
└────────────────────┘
         ↓
┌────────────────────┐
│ [App Content]      │ ← Dimmed
├────────────────────┤
│ ╔════════════════╗ │
│ ║ Movie Details  ║ │ ← Bottom sheet slides up
│ ║                ║ │
│ ║ [Content]      ║ │
│ ║ [Rate Button]  ║ │
│ ╚════════════════╝ │
└────────────────────┘
```

### Responsive Grid
```css
/* Mobile: 1 column */
.grid {
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* Tablet: 2 columns */
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-5);
  }
}

/* Desktop: 3-4 columns */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
  }
}

@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## 🎬 Template System

### Template Card (Browse Templates)
```
┌─────────────────────────────────┐
│ 🎬 Movie Critic Template        │
│                                 │
│ Perfect for detailed movie      │
│ analysis                        │
│                                 │
│ Categories:                     │
│ • Story (40%)                   │
│ • Acting (30%)                  │
│ • Cinematography (20%)          │
│ • Sound (10%)                   │
│                                 │
│ Used by: 1,234 critics          │
│                                 │
│ [Use Template] [Preview]        │
└─────────────────────────────────┘
```

### Domain-Specific Templates (Future)
- **Movies**: Story, Acting, Cinematography, Sound, Editing
- **TV Shows**: Plot, Characters, Pacing, Production, Consistency
- **Music Albums**: Lyrics, Composition, Production, Performance, Cohesion
- **Books**: Plot, Characters, Writing Style, Pacing, Emotional Impact
- **Recipes**: Taste, Difficulty, Time, Ingredients, Presentation

### User-Created Templates
- Create from scratch
- Clone and modify existing
- Share publicly or keep private
- Mark as "Original Creator" badge if popular

---

## 🎨 Component Library

### Buttons

**Primary Button:**
```tsx
<button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition">
  Save Rating
</button>
```

**Secondary Button:**
```tsx
<button className="bg-background-tertiary hover:bg-background-hover text-text-primary px-4 py-2 rounded-lg font-medium transition">
  Cancel
</button>
```

**Icon Button:**
```tsx
<button className="p-2 hover:bg-background-hover rounded-lg transition" aria-label="Add to collection">
  <PlusIcon className="w-5 h-5" />
</button>
```

### Inputs

**Text Input:**
```tsx
<input
  type="text"
  className="bg-background-secondary border border-border-default rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
  placeholder="Search movies..."
/>
```

**Slider (Category Rating):**
```tsx
<input
  type="range"
  min="0"
  max="10"
  step="0.1"
  className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer"
  aria-label="Story rating"
/>
```

### Cards

**Standard Card:**
```tsx
<div className="bg-background-secondary border border-border-subtle rounded-lg p-4 hover:border-border-default transition">
  {/* Card content */}
</div>
```

**Elevated Card (Hover State):**
```tsx
<div className="bg-background-secondary rounded-lg p-4 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
  {/* Card content */}
</div>
```

### Badges

**Badge Component:**
```tsx
<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warm-muted text-warm-primary">
  Early Adopter
</span>
```

**Tag (Genre):**
```tsx
<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-background-tertiary text-text-secondary hover:bg-background-hover transition">
  #Action
</span>
```

---

## 📊 Data Visualization

### Rating Distribution Chart
```
Vertical bar chart showing count per rating bracket:

10★ ████████████          (124)
9★  ████████████████      (245)
8★  ███████████████████   (387)
7★  ████████████████      (296)
6★  ██████████            (152)
5★  ██████                (85)
4★  ████                  (45)
3★  ██                    (12)
2★  █                     (5)
1★  █                     (2)
```

### Activity Heatmap (GitHub-style)
```
Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
█ ░ ░ ▓ ▓ ░ ░ ░ █ █ ▓ ░  ← Days rated
█ ▓ ░ ▓ █ ░ ▓ ░ █ ▓ ░ ░
░ █ ▓ ░ ░ ░ █ ▓ ░ ░ ░ ▓

Legend: ░ 0-2  ▓ 3-5  █ 6+ ratings
```

### Genre Radar Chart (Advanced Stats)
```
         Action
           /\
          /  \
    Sci-Fi    Drama
         |    |
      Comedy--Horror

(Plotted based on count or avg rating per genre)
```

---

## 🚀 Implementation Priorities

### Phase 1: Core Rating System (MVP)
- Simple star rating (quick rate)
- Movie/show cards (grid + list view)
- Basic profile page
- Dark mode only
- Mobile-first responsive

### Phase 2: Detailed Ratings
- Category breakdown with sliders
- Template system (use existing templates)
- Weighted score calculation
- Rating history

### Phase 3: Social Features
- Follow/followers
- Activity feed
- Comments on ratings
- Like system
- Friend ratings display

### Phase 4: Advanced Features
- Create custom templates
- Hierarchical TV show ratings
- Collection management
- Stats dashboard with charts
- Badge system

### Phase 5: Extensibility
- Music albums support
- Books support
- Recipes support
- User-generated item types

---

## 🎭 Background Patterns

### Royal Red Curtain (`.bg-curtain-folds`)

**Use for:** Page backgrounds, hero sections, profile headers

**Styling:** Vertical theater drape pattern using repeating gradient

**Implementation:**
```css
/* In globals.css */
.bg-curtain-folds {
  background: linear-gradient(
    90deg,
    var(--curtain-bg) 0%,
    var(--curtain-highlight) 10%,
    var(--curtain-shadow) 20%,
    var(--curtain-bg) 30%,
    var(--curtain-highlight) 40%,
    var(--curtain-shadow) 50%,
    var(--curtain-bg) 60%,
    var(--curtain-highlight) 70%,
    var(--curtain-shadow) 80%,
    var(--curtain-bg) 90%,
    var(--curtain-highlight) 100%
  );
}
```

**CSS Variables:**
```css
--curtain-bg: hsl(355 70% 25%)         /* Deep red base */
--curtain-highlight: hsl(355 65% 30%)  /* Lighter red for highlights */
--curtain-shadow: hsl(355 75% 20%)     /* Darker red for shadows */
```

**Usage:**
```tsx
<div className="min-h-screen bg-curtain-folds">
  {/* Page content */}
</div>
```

**Design Notes:**
- Creates movie theater ambiance
- Provides warm, professional background
- Use solid `bg-card` for content overlays (avoid transparency on curtains)
- Ensure text has sufficient contrast

---

## ⌨️ Form Input Styling

### Global Focus Outline System

**Universal golden focus states** for all form inputs (Session 9 implementation)

**Implementation:**
```css
/* In @layer base (globals.css) - applies universally */
input:focus,
textarea:focus,
select:focus {
  @apply outline-none ring-2 ring-star-yellow/30 border-star-yellow;
}

/* Light mode variant - darker gold for better visibility */
:root input:focus,
:root textarea:focus,
:root select:focus {
  @apply ring-star-yellow-muted/40 border-star-yellow-muted;
}

/* Dark mode variant - bright gold */
.dark input:focus,
.dark textarea:focus,
.dark select:focus {
  @apply ring-star-yellow/30 border-star-yellow;
}
```

**Benefits:**
- Consistent focus states across all form inputs (no per-component styling needed)
- Theme-aware (bright gold in dark mode, darker gold in light mode)
- Improves accessibility with clear, visible focus indicators
- Matches movie theater design system

**Applies to:**
- Text inputs
- Textareas
- Select dropdowns
- OTP inputs
- Any form element

### OTP Input Component

**6-digit verification code input** with design system styling

**Features:**
- Individual digit boxes with golden focus
- Auto-advance to next input on digit entry
- Backspace navigation
- Paste support (distributes 6-digit code across inputs)
- Disabled state support

**Styling:**
```tsx
<input
  type="text"
  maxLength={1}
  className="w-12 h-14 text-center text-2xl font-mono border-2 border-border rounded-lg
             bg-card text-foreground
             focus:border-star-yellow focus:ring-2 focus:ring-star-yellow/30
             disabled:opacity-50 disabled:cursor-not-allowed"
/>
```

**Usage:**
```tsx
import { OTPInput } from "@/components/ui/otp-input";

<OTPInput
  length={6}
  value={otp}
  onChange={setOtp}
  disabled={isLoading}
/>
```

---

## 🔗 Link Styling Patterns

### Gold/Yellow Links (`.link-gold`)

**Use for:** Call-to-action links, important navigation (forgot password, sign up, login, etc.)

**Styling:**
- Color: `text-star-yellow` (pastel yellow hsl(45 85% 75%))
- Decoration: Always underlined with 50% opacity decoration
- Hover: Brightens to `star-yellow-bright` (hsl(45 90% 65%)) with full opacity underline
- Visited: Maintains `star-yellow` (no purple)
- Focus: 2px outline for keyboard navigation
- Accessibility: 11.07:1 contrast on dark backgrounds (WCAG AAA)

**Implementation:**
```css
/* In globals.css */
.link-gold {
  color: hsl(var(--star-yellow));
  text-decoration: underline;
  text-decoration-color: hsl(var(--star-yellow) / 0.5);
  transition: all 0.2s ease;
}
.link-gold:hover {
  filter: brightness(1.2);
}
```

**Usage:**
```tsx
<Link href="/auth/sign-up" className="link-gold">
  Sign up
</Link>
```

**Applied to:**
- Forgot password link (login form)
- Sign up link (login form)
- Login link (sign-up form)
- Password reset links (sign-up form error messages)

---

## 🎴 Card Styling Guidelines

### Shadows
- **Elevated cards** (profile, modals): `shadow-lg`
- **Standard cards** (home page features, dashboard items): `shadow-md`
- **Subtle cards** (info boxes): `shadow-sm`

### Opacity
- **Primary content cards**: `bg-card` (100% opacity) for maximum readability
- **Secondary/decorative cards**: `bg-card/90` (90% opacity) for glass effect (use sparingly)
- **Avoid**: `bg-card/50` or lower on curtain backgrounds (causes readability issues)

### Borders
- Standard: `border border-border` (full opacity for clear definition)
- Subtle variant: `border-border/60` (only for less prominent cards)
- On curtain backgrounds: Always use full opacity borders for clear separation

### Hover States
- Subtle elevation: `hover:shadow-lg` (when base is `shadow-md`)
- Transform: `hover:-translate-y-1` (lift effect)
- Combined: `transition` for smooth animation

### Current Implementation
**Home Page Cards:**
- Feature highlights: `bg-card border border-border shadow-md` → `hover:shadow-lg`
- CTA card: `bg-card border border-border shadow-md`

**Profile Card:**
- `bg-card shadow-lg` (elevated, prominent)

**Dashboard Cards (to be implemented):**
- Should use `shadow-md` for standard cards
- Hero/stat cards should use `shadow-lg`

---

## 🎨 Navigation Styling

### Nav Bar
**Background:** Solid `bg-background` (no transparency)
- Ensures readability against any page content
- Provides clear visual separation

**Border:** `border-b border-border` for subtle bottom separation

**Rationale:** Transparent nav bars can clash with curtain backgrounds and reduce text readability. Solid background ensures consistent appearance across all pages.

---

## 📝 Design Principles (Summary)

1. **Progressive Disclosure**: Don't overwhelm - show basics, reveal depth on demand
2. **Mobile-First**: Touch-friendly, thumb-reachable, responsive
3. **Accessible by Default**: WCAG AAA compliance, keyboard nav, screen reader support
4. **Warm Yet Professional**: Dark mode + warm accent colors for community feel
5. **Data-Rich but Clean**: Show the numbers without visual clutter
6. **Consistent**: Spacing, colors, typography follow system strictly
7. **Fast Feedback**: Instant saves, optimistic UI, clear loading states
8. **Extensible**: Design system scales from movies to music to anything rateable

---

**This is a living document. Update as patterns evolve!**
