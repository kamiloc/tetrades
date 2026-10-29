# Handoff: The Athlete Passport — Athlete & Trainer Workflows

> **Design handoff.** Athlete tab shell and the club, metric, visibility, and
> achievement-certification workflows required by ADR-013–016.

## Web portals

The web prototype in [`web/`](web/) adds two desktop portal concepts: a platform admin portal for club and trainer management, and a trainer portal for club rosters, metrics, invitations, and achievement certification. It is a visual prototype with mock records; the controls do not describe existing authorization or API capabilities.

Read [WEB-AUDIT.md](WEB-AUDIT.md) before implementing either portal. The trainer workflows must follow ADR-013 and ADR-016. The admin workflow, club/trainer provisioning, credential review, and global activity access need product and security decisions before implementation. Neither portal may grant trainers access to L2 data or imply global admin access to `audit_log`.

---

## About the design files

The files in this bundle (`design/`) are design references created in HTML —
they are a clickable prototype showing intended look and behavior, not
production code to copy. The prototype keeps the established four-tab design
as its base and exposes the additional role-based flows from the Tweaks panel.

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
- Styling: **NativeWind** classes generated from these tokens (see “Intentional production exceptions”; the original `StyleSheet.create` instruction is superseded by AGENTS.md and ADR-011)
- Expo-bundled packages only: `@expo/vector-icons`, `react-native-svg`, `expo-linear-gradient` (added to `apps/mobile` as direct dependencies)

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
       - Right: status chip for Unverified, Pending, Verified, or Rejected
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

**Purpose:** show the athlete's trainer-reported metrics, season trend, and benchmarks. Athletes review these entries; trainers report them.

1. Header: title **"Performance"**, subtitle **"Season 2026 · Midfielder"**.
2. **PF_KPI** — two-column grid of KPI cards. Preserve each source label, value, unit, comparison, icon, and color. Cards use the shared `Card` surface (`paper`, `line`, `radius.xl`, `shadow.sm`) with the values styled as prominent stats.
3. **Speed chart** — plot `PF_SPEED` against `PF_MONTHS` in an SVG chart. Use `react-native-svg` already included with Expo; add no chart package. Draw the source line and area fill using `blue` / `blueTint`; use `line` for grid lines and the prototype's month labels.
4. **PF_BENCH** — one percentile bar per source benchmark. Keep the source's label, percentile, marker position, and order; use `canvas` for tracks and `blue` for fills.
5. **PF_TESTS** — metric rows use the shared list rhythm and show the trainer-reported result and date. Do not use achievement verification chips for metric entries.
6. **MSegmented** — use the source's options and selected state; background `segmented` (`#E9EDF3`), radius `radius.segmented` (10).

### 4. Clubs & trainers

**Purpose:** show incoming club invitations, active club history, and trainers assigned to those clubs.

1. Header: title **"Clubs & trainers"**, subtitle shows active clubs and pending invitations.
2. **Club invitations** — render `CL_REQ` as invitations from a club/trainer, with clear Accept and Decline actions. Acceptance activates the membership; pending and rejected invitations are never public.
3. **Active club history** — render `CL_HIST` chronologically. Only active memberships are eligible for public display, subject to the athlete's club-membership audience setting.
4. **Trainers at your clubs** — render `CL_STAFF` for active clubs. Do not imply that this list grants access to private identity data.

The collections (`PF_KPI`, `PF_SPEED`, `PF_MONTHS`, `PF_BENCH`, `PF_TESTS`, `CL_REQ`, `CL_HIST`, and `CL_STAFF`) contain illustrative prototype data only. They are not live athlete records or production seed data.

### ADR-013–016 workflow previews

The Tweaks panel's **Preview flow** control opens the additional flows in the HTML prototype. These screens use the existing tokens and visual components.

- **Visibility settings:** separate audience controls for achievements, club memberships, and metrics. Show the defaults beside each control: Public for achievements; Private for clubs and metrics. Options are Private, Connections, and Public.
- **Athlete certification:** submit one achievement to one active club; show Pending and allow withdrawal; show the decision and rejection reason; allow a new request after rejection or cancellation. New achievements start Unverified. Editing while Pending is unavailable; editing a Verified achievement requires a warning that it resets to Unverified.
- **Club invitations:** show the inviting club and trainer, then accept or decline. Only acceptance activates the membership and enables trainer access.
- **Trainer certification inbox:** show only pending requests made to the trainer's club. Review title, organization, date, and athlete's public identity. Approve or reject; rejection requires a reason. No general achievement-list or private-profile access.
- **Trainer metric entry:** select an athlete with an active membership, choose a metric, enter result/date, and identify the reporting trainer. The athlete does not submit metric entries; summaries are derived from entries.
- **Public attribution:** a non-owner may see the certifying club name only when the club-membership audience admits them. Otherwise show the verified achievement without club attribution.

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
| `UnverifiedChip`         | Neutral status pill for achievements with no open request       |
| `RejectedChip`           | Danger-tint status pill for rejected achievements               |
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
- BlueCheck and achievement status chips include an accessible label matching their visible state.
- Error panels announce changes with `accessibilityLiveRegion="polite"`.
- Try again controls have a minimum 44 pt hit target. Icon-only actions need an accessible label.
- State icon aliases map to Feather: `alert` → `alert-circle`, `refresh` → `refresh-cw`, and `wifi-off` → `wifi-off`.

## Data states

Every tab has loaded, empty, and error presentations. Continue showing the screen header in each state and use `TAB_STATES[tab].sub[state]` for its subtitle. Keep state layouts in `design/states.jsx`; use the same `StatePanel`, `EmptyRow`, and `OfflineBanner` components across tabs. Show the relevant skeleton while a hook reports `isLoading`.

| Tab | Empty trigger and presentation | Error type / presentation | Empty CTAs and error actions |
|---|---|---|---|
| Profile | No profile data. Dashed avatar, `—` stats, “Build your passport” panel, empty Achievements row. | Profile query failure: “Couldn't load your profile” panel. | Empty: “Build your passport” / “Not now”. Error: “Try again” calls `refetch`; “Sign out” calls session sign-out. |
| Connections | No network entries. “No connections yet” panel and an empty Pending row. | Partial request failure: offline banner, dimmed cached network, “Couldn't load requests” panel. | Empty: “Find athletes” / “Invite teammates”. Error: “Retry” refreshes requests; cached network remains visible. |
| Performance | No performance data. Dashed KPI grid with `—` values and “No performance data yet” panel. | Performance query failure: “Couldn't load performance data” panel. | Empty: “View clubs” / “Manage visibility”. Metrics are trainer-reported. Error: “Try again” calls `refetch`. |
| Clubs | No active clubs. Show invitation and trainer empty rows. | Offline/network failure: danger panel “You're offline” with wifi-off icon. | Empty: “View invitations” / “Manage visibility”. A club initiates membership; athlete accepts or declines. Error: “Try again” calls `refetch`. |

Use the state copy from `TAB_STATES` verbatim:

- **Profile subtitles:** loaded/empty “Your athlete identity”; error “Profile unavailable”. Empty panel: “Build your passport” / “Add your athlete details and achievements to start building your verified profile.” / “Build your passport” / “Not now”. Error panel: “Couldn't load your profile” / “Check your connection and try again.” / “Try again” / “Sign out”. Empty achievement row: “No achievements yet”.
- **Connections subtitles:** loaded “247 athletes · 3 pending”; empty “Your network starts here”; error “Connection issue”. Empty panel: “No connections yet” / “Find athletes you know or invite teammates to join your network.” / “Find athletes” / “Invite teammates”. Error banner: “You're offline”; panel: “Couldn't load requests” / “Your saved network is shown below. Try again to refresh requests.” / “Try again” / “View cached network”.
- **Performance subtitles:** loaded/empty “Season 2026 · Midfielder”; error “Performance unavailable”. Empty panel: “No performance data yet” / “A trainer at one of your active clubs can report your first performance update.” / “View clubs” / “Manage visibility”. Error panel: “Couldn't load performance data” / “Check your connection and try again.” / “Try again” / “Close”.
- **Clubs subtitles:** loaded “2 active clubs · 1 invitation”; empty “Your clubs and invitations”; error “You're offline”. Empty panel: “No active clubs yet” / “When a club invites you, review it here. You choose whether to accept.” / “View invitations” / “Manage visibility”. Error panel: “You're offline” / “Reconnect to refresh your club invitations and active memberships.” / “Try again” / “Close”. Empty rows: “No club invitations”, “No trainers listed”.

---

## Assets

No raster assets. All marks are SVG (AP shield, blue check, Feather icons via `@expo/vector-icons`). Avatars are placeholders generated from initials + an oklch gradient — replace with real photos in Sprint 5.

---

## Files in this handoff

This handoff lives at `docs/design-handoff/`. The HTML prototype is in
`design/`; the values documented above remain the design-token source of truth
for the intended React Native implementation. The bundle also contains
Expo Router screen scaffolds under `app/` and TypeScript token files under
`tokens/`. The prototype source files are:

```
design/
├── index.html              ← interactive entry point
├── app.jsx                 ← tab shell and preview controls
├── screens.jsx             ← profile, connections, and shared UI
├── screens-2.jsx           ← performance and clubs
├── adr-flows.jsx           ← visibility, certification, invitation, trainer flows
├── states.jsx              ← empty and error states
├── ios-frame.jsx           ← device frame
└── tweaks-panel.jsx        ← prototype preview controls
```

The screen scaffolds cover the current four-tab design. The additional
workflow screens are presented in the prototype flow selector; trainer portal
implementation routes remain to be selected when that surface is decided.

The app route inventory is separate from this visual bundle. Current routes
and known coverage differences are recorded under “Out of scope”.

Open `design/index.html` in any modern browser to interact with the
prototype. The Tweaks toolbar lets you switch tabs and workflow previews, set
Data state (loaded / empty / error), toggle sign-in mode, and preview accents.

---

## Production implementation status

The four-tab shell and the athlete-side ADR flows are implemented in `apps/mobile` by the OpenSpec change `refactor-mobile-screens-design-handoff`:

- Tabs: `app/(app)/(tabs)/{profile,connections,performance,clubs}.tsx`, in the order Profile, Connections, Performance, Clubs.
- Stack screens: `app/(app)/search.tsx` (opened from Connections → “Find athletes”), `app/(app)/visibility.tsx`, and `app/(app)/achievements.tsx` (certification sheet).
- Auth: `app/(auth)/login.tsx`, `verify.tsx`, `callback.tsx`. The handoff's illustrative `(auth)/sign-in` and `(tabs)` paths map to these; URLs are unchanged.
- Tokens: `apps/mobile/lib/tokens.js` (also read by `tailwind.config.js`) and `lib/theme.ts`. Components: `apps/mobile/components/` (see its README).

## Intentional production exceptions

Production deliberately differs from this prototype here:

- **Trainer surfaces stay prototype-only.** The trainer certification inbox and trainer metric entry previews are not built, because the trainer portal platform is undecided.
- **Sign-in is email only** (Magic Link with OTP fallback, AGENTS.md Auth rules). The Apple and Google buttons are not built. The value prop “End-to-end secure” reads “Secure and athlete-owned”, because data is encrypted at rest, not end to end.
- **Benchmarks** (percentiles) and **Trainers at your clubs** are deferred until athlete-facing APIs exist.
- **Connections is UI-only.** `connection.listConnections` returns accepted connections as bare ids with no pending-request listing, so the tab shows the real count and “Find athletes”. The network list, the pending-requests card, the Connections badge, “Invite teammates”, and “View cached network” wait for a connection API change.
- **Metric attribution names the club, not the trainer** (“Reported by a trainer at <Club>”), because entries expose only a trainer id. The prototype copy has been aligned.
- **Club invitations show the club, not the inviting trainer**, for the same reason.
- **Styling uses NativeWind**, not `StyleSheet.create` (AGENTS.md, ADR-011).
- **Loaded subtitles use live values** (connection count, active clubs and invitations, sport and position). Empty and error copy is used verbatim from `TAB_STATES`. Error panels omit the “Close” and “View cached network” secondary actions, which have no production behavior. One exception to verbatim copy: the Connections error body reads “Check your connection and try again.” instead of “Your saved network is shown below…”, because production shows no cached network yet.
- **Performance range options** are 1M, 3M, 6M, and All (the prototype leaves `MSegmented` options empty). All-time charts stop at the latest 200 entries and say so.
- **Terms and Privacy Policy** are plain text on sign-in until those pages exist.

## Out of scope (this sprint)

- Public athlete profile route and public web rendering
- Athlete search: the search screen shows a “coming soon” panel. Follow-up change `wire-athlete-search` adds display name and sport to `athlete.searchAthletes` results and a Connect action (`connection.sendRequest`).
- Profile edit flow detail (the app already has a profile-edit route)
- Push notifications (the header bell is decorative)
- Light/dark theme — the design is intentionally light-themed only (the sign-in screen is permanently dark by design)

---

## Design handoff acceptance

- [ ] The prototype retains the four-tab design order: Profile, Connections, Performance, Clubs.
- [ ] Each tab has loaded, empty, and error guidance with consistent copy.
- [ ] Visibility defaults and all three audience choices are explicit per category.
- [ ] Athlete certification covers Unverified, Pending, withdrawal, Verified, Rejected with reason, and resubmission.
- [ ] Club invitations require athlete acceptance before membership becomes active; pending/rejected invitations are not public.
- [ ] Trainer certification is club-scoped, only shows pending requests, and requires a rejection reason.
- [ ] Metric entry is trainer-attributed and limited to active club memberships; athlete metric entry is not offered.
- [ ] Public attribution follows both achievement and club-membership visibility.
- [x] Search, OTP, public profile, profile-edit, and production tab/route differences are documented (see “Production implementation status” and “Intentional production exceptions”).
- [ ] The prototype controls allow reviewers to reach all new screens and certification states.
