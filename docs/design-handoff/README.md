# Handoff: The Athlete Passport — Tab Navigation

> **Sprint 3 deliverable.** Bottom-tab navigation shell for the Athlete
> Passport iOS app. Profile and Connections remain, with Performance and
> Clubs & trainers added as athlete-facing tabs.

---

## About the design files

The files in this bundle (`design/`) are **design references created in HTML** — they're a clickable prototype showing intended look and behavior, not production code to copy.

**Your task:** recreate these designs in the target codebase
(`apps/mobile/`) using React Native + Expo Router. Use the **TypeScript token files in `tokens/`** as the source of truth for colors, typography, spacing, radii, and shadows — they map 1:1 to the values in the HTML.

The `app/(tabs)/` folder contains drop-in route scaffolds. Each file has a
detailed comment describing what to build. Replace the JSX comments with real
components as you implement.

---

## Fidelity

**High-fidelity.** The HTML prototype uses final colors, typography,
spacing, copy, and interactions. Aim for pixel-parity within the constraints
of native rendering (system fonts, native shadow model, platform safe areas).

---

## Tech stack (fixed)

- React Native + Expo (SDK that ships `@expo/vector-icons`)
- Expo Router — file-based routing, `(tabs)` group
- TypeScript, `"strict": true`
- `StyleSheet.create` for all styles (no NativeWind, no Tailwind, no styled-components)
- **No new npm dependencies** beyond what Expo provides

The only icon library used is `@expo/vector-icons` (Feather set), which is
included with Expo by default.

---

## File map

Drop these into `apps/mobile/`:

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   └── sign-in.tsx        ← login screen (provided)
│   └── (tabs)/
│       ├── _layout.tsx        ← bottom tab bar config (provided)
│       ├── profile.tsx        ← stub (provided)
│       ├── connections.tsx    ← stub (provided)
│       ├── performance.tsx    ← stub (provided)
│       └── clubs.tsx          ← stub (provided)
└── tokens/
    ├── colors.ts              ← provided
    ├── typography.ts          ← provided
    ├── spacing.ts             ← provided
    └── index.ts               ← provided
```

Add to `tsconfig.json` so `@/tokens` resolves:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## Design tokens

### Colors (`tokens/colors.ts`)

| Token              | Hex                      | Used for                                          |
|--------------------|--------------------------|---------------------------------------------------|
| `ink`              | `#0B1220`                | Dark header background (top of gradient)         |
| `ink2`             | `#131B2E`                | Dark header background (bottom)                  |
| `paper`            | `#FFFFFF`                | Card surface                                      |
| `canvas`           | `#F4F6FA`                | App background under cards                       |
| `line`             | `#E5E8EE`                | Hairline dividers, card borders                  |
| `text`             | `#0F172A`                | Primary text on light surfaces                   |
| `muted`            | `#6B7280`                | Secondary / meta text                            |
| `subtle`           | `#9AA3B2`                | Tertiary text, placeholders                      |
| `onInk`            | `#FFFFFF`                | Header title text                                |
| `onInkMuted`       | `rgba(255,255,255,0.55)` | Header subtitle                                  |
| **`blue`**         | **`#1A6BFF`**            | **Athletic accent — CTAs, links, verified**     |
| `blueTint`         | `#E8F0FF`                | Verified chip background, soft callouts          |
| `blueLine`         | `#D8E4FB`                | Borders on blue surfaces                         |
| `danger`           | `#C23B3B`                | Error icons and accents                          |
| `dangerTint`       | `#FDECEC`                | Offline and danger surfaces                      |
| `dangerLine`       | `#F6D4D4`                | Error panel border                               |
| `dash`             | `#CBD3DF`                | Dashed empty-state outlines                      |
| `segmented`        | `#E9EDF3`                | Segmented control background                     |
| `pending`          | `#B5651D`                | Pending chip text                                |
| `pendingTint`      | `#FFF3E0`                | Pending chip background                          |
| `tabActive`        | `#1A6BFF`                | Active tab icon + label                          |
| `tabInactive`      | `#8A93A4`                | Inactive tab icon + label                        |

### Typography (`tokens/typography.ts`)

System fonts only — `fontFamily` is left unset so RN picks SF Pro (iOS) /
Roboto (Android). Use the named presets in `text.*`:

| Preset             | Size | Weight | Where                                            |
|--------------------|-----:|:------:|--------------------------------------------------|
| `headerLargeTitle` |   26 |  700   | Header `<h1>` on every screen                    |
| `headerSubtitle`   |   13 |  400   | Header subline (`Your athlete identity`, etc.)   |
| `headerBrand`      |   11 |  600   | `THE ATHLETE PASSPORT` wordmark (tracked, upper) |
| `cardTitle`        |   19 |  700   | "Marcus Chen"                                    |
| `rowTitle`         |   14 |  600   | List row titles                                  |
| `body`             |   15 |  400   | Bio paragraph, descriptive copy                  |
| `stateTitle`       |   18 |  700   | State-panel title                                |
| `stateBody`        | 13.5 |  400   | State-panel body                                 |
| `meta`             |   12 |  400   | Row meta, captions                               |
| `sectionEyebrow`   |   12 |  700   | Uppercase section labels                         |
| `statValue`        |   17 |  700   | Height / Weight / Connections numbers            |
| `statLabel`        |   11 |  600   | Uppercase stat labels                            |
| `tabLabel`         | 10.5 |  500   | Inactive tab label                               |
| `tabLabelActive`   | 10.5 |  700   | Active tab label                                 |
| `chip`             |   11 |  600   | Verified / Pending chip text                     |
| `ctaPrimary`       |   13 |  600   | Primary button text                              |

### Spacing (`tokens/spacing.ts`)

4-pt scale on `space`:

| Token   | px | Used for                              |
|---------|---:|---------------------------------------|
| `xs`    |  4 | Inline icon gaps                      |
| `sm`    |  8 | Chip padding                          |
| `md`    | 12 | Row inner padding                     |
| `lg`    | 16 | **Screen edge padding, card padding** |
| `xl`    | 20 | Header padding-x, section gutter      |
| `2xl`   | 24 |                                       |
| `3xl`   | 32 |                                       |

### Radii (`radius`)

| Token   | px | Used for                              |
|---------|---:|---------------------------------------|
| `sm`    |  6 | Tiny tags                             |
| `md`    |  9 | Avatar and compact icon tiles          |
| `lg`    | 12 | Rounded input surfaces                |
| `segmented` | 10 | Segmented control                    |
| `xl`    | 16 | **All cards**                         |
| `2xl`   | 18 | Auth gate AP icon                     |
| `pill`  |999 | Buttons, chips, badges                |

### Shadows (`shadow`)

Cross-platform: iOS `shadow*` props + Android `elevation`. Apply via
`style={[styles.card, shadow.sm]}`.

| Token     | iOS                                          | Android | Used for                  |
|-----------|----------------------------------------------|--------:|---------------------------|
| `sm`      | `#0F172A 0/1 · 0.04 · 2`                     |    `1`  | All cards                 |
| `cta`     | `#1A6BFF 0/4 · 0.25 · 12`                    |    `4`  | Primary action buttons    |
| `ctaLg`   | `#1A6BFF 0/6 · 0.28 · 16`                    |    `6`  | Auth-gate Sign In button  |
| `ink`     | `#0B1220 0/10 · 0.18 · 20`                   |    `6`  | Sign-in brand tile, AP shield |

---

## Screens

### Auth gate (route-level)

The app has two route groups: `(auth)` (signed-out only) and `(tabs)` (signed-in only). The root layout redirects between them based on `useSession()`:

```tsx
// app/_layout.tsx (sketch)
import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/lib/auth';

export default function RootLayout() {
  const { session, isLoading } = useSession();
  if (isLoading) return <Splash />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session
        ? <Stack.Screen name="(tabs)" />
        : <Stack.Screen name="(auth)" />}
    </Stack>
  );
}
```

The per-tab AuthGate from earlier drafts is **removed** — unauthenticated users never reach the tab UI.

---

### 0. Sign-in (login screen)

**Purpose:** front door to the app. Athletes choose an OAuth provider (Apple / Google) or sign in with email. Same layout for first-time vs returning users — only copy differs.

**Layout (375×812, full-bleed dark, no tab bar, no header):**

1. **Background**
   - Radial gradient `120% 80% at 50% 0%`: `#1B2845` → `colors.ink` at 55% → `#050811`
   - Faint diagonal field-lines overlay: repeating linear gradient at 120°, 1 px white-50% stripes every 28 px, layer opacity `0.08`
   - Soft blue radial glow top-left: 320×320, `rgba(26,107,255,0.35)` → transparent

2. **Top block** (paddingTop `47 + 56`, paddingX 28)
   - **Brand tile** — 56×56, `radius.xl`, bg `rgba(26,107,255,0.16)`, border `rgba(26,107,255,0.35)`, `shadow.ink` + inset white 1px hairline. Contains `<ApMark size={28} />`.
   - Eyebrow (`text.headerBrand`, white 55%): **"THE ATHLETE PASSPORT"**
   - Headline (32 / 700, ls -0.6, line 1.1, white):
     - **signin** → `"Welcome back,\nathlete."`
     - **create** → `"Build your verified\nathletic identity."`
   - Body (`text.body`, white 62%, max-width 300):
     - **signin** → "Sign in to your verified record, network, and club stats."
     - **create** → "Verified achievements, club history, and trainer-reported stats — owned by you, shared on your terms."
   - **Value props** — 3 rows, gap 12. Each row: 28×28 tile (radius 8, white-6% bg, white-10% border) + Feather icon size 15 (white-78%) + 13.5 px label (white-78%):
     - `shield` · "Stats reported by your club's trainers"
     - `users`  · "A trusted network of athletes & coaches"
     - `lock`   · "End-to-end secure · athlete-owned"

3. **Bottom block** (marginTop auto, paddingX 20, gap 10)
   - **AuthButton** ×3 (height 50, radius 12, fontSize 15 / weight 600, full width):
     - **Apple** — bg `#000`, color `#fff`, 1 px `rgba(255,255,255,0.12)` border
     - **Google** — bg `#fff`, color `colors.text`
     - **Email** — bg `colors.blue`, color `#fff`, shadow `#1A6BFF 0/6 · 0.40 · 18`
   - Footer row (13.5, white-62%, centered):
     - **signin** → `New to Athlete Passport? **Create account**`
     - **create** → `Already a member? **Sign in**`
   - Terms microcopy (11.5, white-42%, centered): "By continuing you agree to our **Terms** & **Privacy Policy**."

4. Home-indicator safe area handled by `SafeAreaView` (edges `['bottom']`).

**Behavior:**
- Pressing any provider button calls `signIn(provider)` from `useSession()`.
- On success → `router.replace('/(tabs)/profile')`.
- On failure → render an inline error banner above the button stack (12 px radius, `rgba(229,92,92,0.12)` bg, `rgba(229,92,92,0.3)` border, `#FCA5A5` text): **"Couldn't sign you in. Try again."**
- The footer **Create account / Sign in** link toggles between modes via local component state; no separate route required.

**Provider buttons — production note:**
The prototype shows neutral monogram placeholders so the design ships without trademarked assets. For shipping, use the official SDKs (these add new dependencies — flag with product before installing):
- Apple: `expo-apple-authentication` → `<AppleAuthentication.AppleAuthenticationButton>`
- Google: `@react-native-google-signin/google-signin` or Expo Auth Session with the Google provider

---

### Tab order (do not change)

| # | Route                  | Title         | Icon (Feather) | Badge source |
|---|------------------------|---------------|----------------|--------------|
| 1 | `(tabs)/profile`       | Profile       | `user`         | —            |
| 2 | `(tabs)/connections`   | Connections   | `users`        | `pendingCount` (3) |
| 3 | `(tabs)/performance`   | Performance   | `activity`     | —            |
| 4 | `(tabs)/clubs`         | Clubs         | `flag`         | `requestCount` (2) |

**Initial active tab:** Profile (Expo Router defaults to the first child of the `(tabs)` group; keep `profile.tsx` first).

---

### 1. Profile (landing state)

**Purpose:** the athlete's own identity page — what other athletes see and what the user can edit.

**Layout (375 px wide, scrollable, padded `space.lg = 16`):**

1. **Dark header** (shared `<ScreenHeader>`)
   - Background: linear gradient `colors.ink → colors.ink2`, top→bottom
   - Top safe area: 47 px (iOS notch)
   - Brand row (32 px tall, marginTop 6):
     - Left: 18 px AP shield + `THE ATHLETE PASSPORT` (`text.headerBrand`)
     - Right: 32×32 rounded button (`headerChipBg` / `headerChipBorder`) with a Feather `bell` icon (size 16) + a 6 px blue dot at top-right (boxShadow `0 0 0 1.5px ink` to punch through)
   - Title (`text.headerLargeTitle`): **"Profile"**, white
   - Subtitle (`text.headerSubtitle`, `onInkMuted`): **"Your athlete identity"**
   - Bottom border: 1px `headerHairline`

2. **Identity card** — `marginTop: -20` so it overlaps the header by 20 px.
   - `radius.xl`, `paper`, `1px line` border, `shadow.sm`, padding `20/18/18`
   - Top row (`flexDirection: row`, gap 14, align center):
     - **Avatar** 68 px, hue 230, jersey stripe overlay, with a `#FFF` 3px ring + `#1A6BFF` 2px outer ring
     - Right column:
       - Name row: **"Marcus Chen"** (`text.cardTitle`) + 16 px `<BlueCheck>` (blue circle with white check)
       - Sport line (marginTop 4, `meta`, `muted`): **"Midfielder · Soccer"**
       - Tags row (marginTop 8, gap 6): `<Tag>Stanford Cardinal</Tag>`, `<Tag tone="blue">NCAA D1</Tag>`
   - Divider: 1px `line`, marginTop 18, paddingTop 16
   - **Stats grid** (3 cols, equal). Each stat:
     - Value (`text.statValue`): `6'1"`, `178 lb`, `247` (the `247` is `colors.blue` to suggest tappable)
     - Label (`text.statLabel`, `muted`, uppercase): `HEIGHT`, `WEIGHT`, `CONNECTIONS`
     - Columns 2 and 3 have a 1px `line` left border with `paddingLeft: 14`

3. **About section**
   - Eyebrow `<SectionTitle>ABOUT</SectionTitle>` (padding 0 4 8, `text.sectionEyebrow`, `muted`)
   - Card, padding `14/16`:
     - Paragraph (`text.body`, `text`, `text-wrap: pretty`):
       > "Center mid at Stanford. PAC-12 All-Conference 2024. Two-footed playmaker focused on tempo control and final-third creation. Records verified through Athlete Passport since 2023."
     - Meta row (marginTop 10, gap 14, `meta`, `muted`):
       - Feather `map-pin` 13px + **"Palo Alto, CA"**
       - Feather `clock` 13px + **"Joined Aug 2023"**

4. **Achievements section**
   - Eyebrow **"ACHIEVEMENTS"** with right link **"See all"** (blue, 12.5, semibold)
   - Card with 3 rows, separated by 1px `line` (no border on last):
     - Each row (padding `12/16`, gap 12, align center):
       - 34×34 tile, `radius.md`, background `blueTint` (verified) or `pendingTint` (pending)
       - Feather `check` (verified) or `clock` (pending), size 17, color `blue` / `pending`, stroke 2.2
       - Center column: title (`text.rowTitle`) + meta (`text.meta`, `muted`)
       - Right: `<VerifiedChip small />` or `<PendingChip small />`
   - Rows in order:
     1. *PAC-12 All-Conference* · "2024 · Stanford Athletics" · **verified**
     2. *U.S. Youth National Team — Player Pool* · "2023 · U.S. Soccer" · **verified**
     3. *Combine: 40-yd dash · 4.61s* · "2025 · Bay Area Showcase" · **pending**

5. **Passport completeness card**
   - Background: linear-gradient `#F7FAFF → #FFFFFF`, border `blueLine`
   - Row (padding `14/16`, gap 12, align center):
     - 40×40 tile, `radius.md`, `blueTint` bg, Feather `shield` size 20, color `blue`
     - Center: title **"Passport 82% complete"** (`text.rowTitle`), then a 6 px tall progress track (`#E6ECF6`) with 82% blue fill (`pill` radius), marginTop 6
     - Right: ghost button **"Finish"** (`#FFF` bg, `line` border, `pill`, padding `7/14`, `12.5`/600/`text`)

---

### 2. Connections

**Purpose:** see your network and incoming requests.

1. Header: title **"Connections"**, subtitle **"247 athletes · 3 pending"**
2. **Pending Requests** section (padding top `lg`, eyebrow + right link **"Manage"**):
   - Card, padding 14:
     - Stacked avatars: 3 × 36 px avatars (Kai, Zara, Ethan), each with a 2px `#FFF` border, overlapping by `marginLeft: -10`
     - Center: **"3 athletes want to connect"** (`text.rowTitle`) + **"Kai, Zara, Ethan"** (`text.meta`, `muted`)
     - Right: blue pill badge **"3"** (`colors.blue` bg, `#FFF` text, `pill`, min-width 22, height 22, padding `0/7`, 12/700)
3. **Your Network** section, right meta **"247 total"**:
   - Card with 6 rows (sample data, padding `12/16`, dividers between):
     - 44 px avatar (varied hues) · name (`text.rowTitle`) + `<BlueCheck size={13}>` if verified · sport line (`meta`/`muted`) · org line (`meta` `12`/`subtle`)
     - Right: outline button **"Message"** — `#FFF` bg, `blueLine` border, `pill`, padding `6/12`, 12/600, color `blue`
   - Names (in order): **Sofia Martinez** (✓) · **James Okafor** (✓) · **Amelia Reed** (✓) · **Devon Brooks** (no check) · **Priya Shah** (✓) · **Liam O'Connor** (✓)

---

### 3. Performance

**Purpose:** show the athlete's current season KPIs, speed trend, peer benchmarks, and recorded tests.

1. Header: title **"Performance"**, subtitle **"Season 2026 · Midfielder"**.
2. **PF_KPI** — two-column grid of KPI cards. Preserve each source label, value, unit, comparison, icon, and color. Cards use the shared `Card` surface (`paper`, `line`, `radius.xl`, `shadow.sm`) with the values styled as prominent stats.
3. **Speed chart** — plot `PF_SPEED` against `PF_MONTHS` in an SVG chart. Use `react-native-svg` already included with Expo; add no chart package. Draw the source line and area fill using `blue` / `blueTint`; use `line` for grid lines and the prototype's month labels.
4. **PF_BENCH** — one percentile bar per source benchmark. Keep the source's label, percentile, marker position, and order; use `canvas` for tracks and `blue` for fills.
5. **PF_TESTS** — test rows use the shared achievement-row rhythm and verified/pending chips. Keep the source's test name, result, date, and status.
6. **MSegmented** — use the source's options and selected state; background `segmented` (`#E9EDF3`), radius `radius.segmented` (10).

### 4. Clubs & trainers

**Purpose:** show trainer requests, the athlete's club history, and staff with access.

1. Header: title **"Clubs & trainers"**, subtitle **"3 clubs · 2 trainer requests"**.
2. **Trainer requests** — render `CL_REQ` in a card as trainer rows with identity, club, and permission chips. Keep the source's request order and copy.
3. **Club history** — render `CL_HIST` as a chronological timeline. Mark the current club using the prototype's current-club flag treatment; retain the source periods and club names.
4. **Staff access** — render `CL_STAFF` in a card with the source's staff identity, role, club, and access detail.

The data collections (`PF_KPI`, `PF_SPEED`, `PF_MONTHS`, `PF_BENCH`, `PF_TESTS`, `CL_REQ`, `CL_HIST`, and `CL_STAFF`) are the source for row content and plotted values. Do not replace them with hand-authored athlete data.

---

## Components to build

Build these in `apps/mobile/components/`:

| Component                | Responsibility                                                  |
|--------------------------|-----------------------------------------------------------------|
| `ScreenHeader`           | Dark gradient header (brand row + title + subtitle)             |
| `ApMark`                 | The shield wordmark SVG (use `react-native-svg` from Expo)      |
| `Card`                   | `paper` surface, `radius.xl`, `line` border, `shadow.sm`        |
| `SectionTitle`           | Uppercase eyebrow + optional right slot                         |
| `Avatar`                 | Linear-gradient circle with initials + jersey stripe overlay    |
| `BlueCheck`              | Verified badge — blue circle + white check                      |
| `VerifiedChip`           | Pill chip — `blueTint` / `blue` / check icon                    |
| `PendingChip`            | Pill chip — `pendingTint` / `pending` / clock icon              |
| `Tag`                    | Square tag — default (`#F1F4F9`) or `blue` tone                 |
| `AchievementRow`         | Tile icon + title + meta + chip                                 |
| `ConnectionRow`          | Avatar + name (+ check) + sport + org + action button           |
| `ValueProp`              | Sign-in icon-tile + label row (dark surface)                    |
| `AuthButton`             | Provider button (apple / google / email variants)               |
| `MSegmented`             | Performance range/segment switch using `segmented` and radius 10 |
| `SpeedChart`              | SVG speed series and month labels; no chart dependency          |
| `StatePanel`              | Empty/error hero panel with actions and optional error code     |
| `EmptyRow`                | Inline dashed-icon empty row inside a section card              |
| `OfflineBanner`           | Compact danger-tint connectivity banner with Retry action       |

> **Linear gradients** (used in the header and blue state panels) need `expo-linear-gradient`, which is included by default with Expo and does not count as a new dependency.
>
> **SVG primitives** (BlueCheck, ApMark, jersey stripes) need `react-native-svg`, also included with Expo.

---

## Interactions & behavior

- **Tab switching:** standard Expo Router. No cross-tab state; each screen owns its own data hooks.
- **Badges:** Connections reads `useConnections().pendingCount`; Clubs reads `useClubs().requestCount`. Hide each badge when its count is `0`, while loading, or while that tab is in empty/error state.
- **Active tint:** label and icon swap to `colors.blue`; label weight goes from 500 → 700 (`text.tabLabel` → `text.tabLabelActive`).
- **Data-state preview:** the prototype's Data state control switches among loaded, empty, and error for the active tab. `TabBar` hides badges outside loaded state.
- **Retry:** error-panel and offline-banner Try again/Retry actions call the relevant hook's `refetch()`.
- **Safe areas:** wrap each screen in `SafeAreaView` from `react-native-safe-area-context` (Expo bundled) with `edges={['top']}` — the dark header should extend behind the status bar but content must respect the notch. The tab bar bottom inset is handled by Expo Router automatically on iOS via the `paddingBottom: 20` we pass.

## State hooks

Wire hooks from `apps/mobile/lib/`:

```ts
useSession()       // { session, signIn, signOut }
useProfile()       // { data, isLoading, error, refetch }
useConnections()   // { data, pendingCount, isLoading, error, refetch }
usePerformance()   // { data, isLoading, error, refetch }
useClubs()         // { data, requestCount, isLoading, error, refetch }
```

Each tab branches in this order: `isLoading` → skeleton; `error` → error state; empty data → empty state; otherwise → loaded screen. A partial Connections request failure keeps the cached network visible while surfacing the request error.

---

## Accessibility

- All tappable elements ≥ 44×44 (`minTouch`).
- Tab buttons get `accessibilityRole="tab"`, `accessibilityLabel="<label>"`, and `accessibilityState={{ selected: focused }}`.
- BlueCheck, VerifiedChip, PendingChip include an `accessibilityLabel` ("Verified", "Pending").
- Error panels announce changes with `accessibilityLiveRegion="polite"`.
- Try again controls have a minimum 44 pt hit target. Icon-only actions need an accessible label.
- State icon aliases map to Feather: `alert` → `alert-circle`, `refresh` → `refresh-cw`, and `wifi-off` → `wifi-off`.

## Data states

Every tab has loaded, empty, and error presentations. Continue showing the screen header in each state and use `TAB_STATES[tab].sub[state]` for its subtitle. Keep state layouts in `design/states.jsx`; use the same `StatePanel`, `EmptyRow`, and `OfflineBanner` components across tabs. Show the relevant skeleton while a hook reports `isLoading`.

| Tab | Empty trigger and presentation | Error type / presentation | Empty CTAs and error actions |
|---|---|---|---|
| Profile | No profile data. Dashed avatar, `—` stats, “Build your passport” panel, empty Achievements row. | Profile query failure: “Couldn't load your profile” panel. | Empty: “Build your passport” / “Not now”. Error: “Try again” calls `refetch`; “Sign out” calls session sign-out. |
| Connections | No network entries. “No connections yet” panel and an empty Pending row. | Partial request failure: offline banner, dimmed cached network, “Couldn't load requests” panel. | Empty: “Find athletes” / “Invite teammates”. Error: “Retry” refreshes requests; cached network remains visible. |
| Performance | No performance data. Dashed KPI grid with `—` values and “No performance data yet” panel. | Performance query failure: “Couldn't load performance data” panel. | Empty: “Log a session” / “Invite a trainer”. Error: “Try again” calls `refetch`. |
| Clubs | No club history. “Add your club history” panel, empty Trainer requests and Staff rows. | Offline/network failure: danger panel “You're offline” with wifi-off icon. | Empty: “Add a club” / “Invite a trainer”. Error: “Try again” calls `refetch`. |

Use the state copy from `TAB_STATES` verbatim:

- **Profile subtitles:** loaded/empty “Your athlete identity”; error “Profile unavailable”. Empty panel: “Build your passport” / “Add your athlete details and achievements to start building your verified profile.” / “Build your passport” / “Not now”. Error panel: “Couldn't load your profile” / “Check your connection and try again.” / “Try again” / “Sign out”. Empty achievement row: “No achievements yet”.
- **Connections subtitles:** loaded “247 athletes · 3 pending”; empty “Your network starts here”; error “Connection issue”. Empty panel: “No connections yet” / “Find athletes you know or invite teammates to join your network.” / “Find athletes” / “Invite teammates”. Error banner: “You're offline”; panel: “Couldn't load requests” / “Your saved network is shown below. Try again to refresh requests.” / “Try again” / “View cached network”.
- **Performance subtitles:** loaded/empty “Season 2026 · Midfielder”; error “Performance unavailable”. Empty panel: “No performance data yet” / “Log a session or invite a trainer to add your first performance update.” / “Log a session” / “Invite a trainer”. Error panel: “Couldn't load performance data” / “Check your connection and try again.” / “Try again” / “Close”.
- **Clubs subtitles:** loaded “3 clubs · 2 trainer requests”; empty “Your club history”; error “You're offline”. Empty panel: “Add your club history” / “Add clubs to your profile and manage trainer access from here.” / “Add a club” / “Invite a trainer”. Error panel: “You're offline” / “Reconnect to refresh clubs and trainer requests.” / “Try again” / “Close”. Empty rows: “No trainer requests”, “No staff listed”.

---

## Assets

No raster assets. All marks are SVG (AP shield, blue check, Feather icons via `@expo/vector-icons`). Avatars are placeholders generated from initials + an oklch gradient — replace with real photos in Sprint 5.

---

## Files in this bundle

```
design_handoff_athlete_passport_tabs/
├── README.md                       ← you are here
├── tokens/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── index.ts
├── app/
│   ├── (auth)/
│   │   └── sign-in.tsx             ← login screen (stub)
│   └── (tabs)/
│       ├── _layout.tsx             ← tab bar wiring (Feather icons)
│       ├── profile.tsx             ← stub
│       ├── connections.tsx         ← stub
│       ├── performance.tsx         ← stub
│       └── clubs.tsx               ← stub
└── design/
    ├── index.html                  ← interactive prototype (open in browser)
    ├── app.jsx
    ├── screens.jsx
    ├── screens-2.jsx
    ├── states.jsx
    ├── ios-frame.jsx
    └── tweaks-panel.jsx
```

Open `design/index.html` in any modern browser to interact with the
prototype. The Tweaks toolbar lets you switch tabs, set Data state
(loaded / empty / error), toggle sign-in mode, and preview alternate accents.

---

## Out of scope (this sprint)

- Real OAuth wiring (Apple / Google SDKs) — flag with product before adding deps
- Profile **edit** mode
- Documents and Search screens; both are future work
- Trainer request accept/decline actions wired to the backend
- Push notifications
- Light/dark theme — the design is intentionally light-themed only (the sign-in screen is permanently dark by design)

---

## Definition of done

- [ ] Unauthenticated users land on `(auth)/sign-in` and never see the tab UI.
- [ ] `(tabs)/_layout.tsx` renders four tabs in the specified order with Feather icons; Connections and Clubs badges use hook counts and hide at zero, empty, or error.
- [ ] Profile screen matches the prototype within ±2 px on iPhone 14 (375×812).
- [ ] Connections, Performance, and Clubs & trainers render their loaded content.
- [ ] Each tab renders loaded, empty, and error states with the matching header subtitle, copy, and actions.
- [ ] Shared `StatePanel`, `EmptyRow`, and `OfflineBanner` match the specification and announce errors accessibly.
- [ ] Successful sign-in routes to `(tabs)/profile`; sign-out routes back to `(auth)/sign-in`.
- [ ] No imports from `nativewind`, `tailwind*`, `styled-components`, or any new npm dependency outside the Expo SDK (Apple/Google SDKs flagged for follow-up sprint).
- [ ] `tsc --noEmit` passes under `"strict": true`.
