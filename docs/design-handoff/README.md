# Handoff: The Athlete Passport — Tab Navigation

> **Sprint 3 deliverable.** Bottom-tab navigation shell for the Athlete
> Passport iOS app. Profile tab is fully designed; Connections/Search are
> populated; Documents is an intentional locked placeholder for Sprint 4.

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
│       ├── documents.tsx      ← stub, locked state (provided)
│       └── search.tsx         ← stub (provided)
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
| `cardTitle`        |   19 |  700   | "Marcus Chen", "Verified medical records"        |
| `rowTitle`         |   14 |  600   | List row titles                                  |
| `body`             |   15 |  400   | Bio paragraph, descriptive copy                  |
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
| `md`    |  9 | Avatar tiles, locked doc icon         |
| `lg`    | 12 | Search field                          |
| `xl`    | 16 | **All cards**                         |
| `2xl`   | 18 | Auth gate AP icon                     |
| `pill`  |999 | Buttons, chips, badges                |

### Shadows (`shadow`)

Cross-platform: iOS `shadow*` props + Android `elevation`. Apply via
`style={[styles.card, shadow.sm]}`.

| Token     | iOS                                          | Android | Used for                  |
|-----------|----------------------------------------------|--------:|---------------------------|
| `sm`      | `#0F172A 0/1 · 0.04 · 2`                     |    `1`  | All cards                 |
| `cta`     | `#1A6BFF 0/4 · 0.25 · 12`                    |    `4`  | Notify-me CTA, Connect    |
| `ctaLg`   | `#1A6BFF 0/6 · 0.28 · 16`                    |    `6`  | Auth-gate Sign In button  |
| `ink`     | `#0B1220 0/10 · 0.18 · 20`                   |    `6`  | Lock hero icon, AP shield |

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
     - **signin** → "Sign in to your verified records, network, and document vault."
     - **create** → "Cryptographically signed physicals, clearances, and stats — owned by you, shareable with coaches and teams."
   - **Value props** — 3 rows, gap 12. Each row: 28×28 tile (radius 8, white-6% bg, white-10% border) + Feather icon size 15 (white-78%) + 13.5 px label (white-78%):
     - `shield` · "Records signed by team medical staff"
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

| # | Route                 | Title         | Icon (Feather) | Decorator     |
|---|-----------------------|---------------|----------------|---------------|
| 1 | `(tabs)/profile`      | Profile       | `user`         | —             |
| 2 | `(tabs)/connections`  | Connections   | `users`        | Badge `3`     |
| 3 | `(tabs)/documents`    | Documents     | `file-text`    | Lock dot      |
| 4 | `(tabs)/search`       | Search        | `search`       | —             |

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
   - Card with 4 rows, separated by 1px `line` (no border on last):
     - Each row (padding `12/16`, gap 12, align center):
       - 34×34 tile, `radius.md`, background `blueTint` (verified) or `pendingTint` (pending)
       - Feather `check` (verified) or `clock` (pending), size 17, color `blue` / `pending`, stroke 2.2
       - Center column: title (`text.rowTitle`) + meta (`text.meta`, `muted`)
       - Right: `<VerifiedChip small />` or `<PendingChip small />`
   - Rows in order:
     1. *PAC-12 All-Conference* · "2024 · Stanford Athletics" · **verified**
     2. *U.S. Youth National Team — Player Pool* · "2023 · U.S. Soccer" · **verified**
     3. *Combine: 40-yd dash · 4.61s* · "2025 · Bay Area Showcase" · **pending**
     4. *Annual Physical — Cleared* · "Mar 2025 · Stanford Sports Med" · **verified**

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

### 3. Documents — locked / Sprint 4 placeholder

**Purpose:** placeholder until Sprint 4 ships medical-record verification.

1. Header: title **"Documents"**, subtitle **"Verified medical records"**
2. **Lock hero card** (padding `24/lg/0`):
   - Card, padding `22/18`, center-aligned text, gradient bg `#F7FAFF → #FFFFFF`, border `blueLine`
   - 56×56 ink-colored square (`radius.xl`, `colors.ink`, `shadow.ink`) centered, with white Feather `lock` size 26
   - Eyebrow (marginTop 14, blue, uppercase): **"SPRINT 4 · COMING SOON"**
   - Title (`text.cardTitle`): **"Verified medical records"**
   - Body (`text.meta` 13.5, `muted`, max-width 280, line-height 1.5):
     > "Securely upload physicals, ECGs, and clearance forms. Cryptographically signed by your team's medical staff."
   - Primary CTA **"Notify me when ready"** — blue pill, `#FFF` text, padding `10/20`, `13/600`, `shadow.cta`
3. **Preview · locked** section:
   - Card with 4 rows at `opacity: 0.7`:
     - Left: 38×44 doc placeholder — repeating diagonal stripe `#EEF1F6 / #F6F8FB` at 135°, 6px stripes, 1px `line` border, lock icon centered (Feather `lock` 14px, `subtle`)
     - Center: title + meta (greyed)
     - Right: Feather `lock` 16px, `subtle`
   - Rows: **Annual Physical Examination** · **ECG · Cardiac Screening** · **Concussion Baseline (ImPACT)** · **Orthopedic Clearance**
4. Footer note (marginTop 10, padding 0 6, 11.5px, `subtle`, line-height 1.5):
   > "Document uploads, signing, and sharing will arrive in Sprint 4. Today this tab is a placeholder."

**Notify-me CTA behavior:** POST `/api/notify-me` with `feature: 'documents'`, show a toast on success.

---

### 4. Search

**Purpose:** discover other athletes by name or sport.

1. Header: title **"Discover"**, subtitle **"Find athletes & teams"**
2. **Search field** (padding `lg/lg/0`):
   - `paper` bg, 1px `line`, `radius.lg`, padding `11/14`, `shadow.sm`
   - Row gap 8: Feather `search` 18 (`subtle`) · placeholder text "Search athletes by name or sport" (14.5, `subtle`, flex 1) · right hint chip **"⌘K"** (11/`muted`, `canvas` bg, 1px `line`, `radius.xs`, padding `2/6`)
   - Tap → push to `app/search/results.tsx` (out of scope for this sprint) OR focus the inline input
3. **Browse by sport** — flex-wrap row of 10 pill buttons (`paper` bg, 1px `line`, `pill`, padding `8/14`, 13/500/`text`):
   > Soccer · Basketball · Football · Track & Field · Volleyball · Baseball · Tennis · Swimming · Rowing · Lacrosse
4. **Recent** section (right link **"Clear"**, blue):
   - Card, 3 rows: clock icon tile (32×32 `canvas` bg + `line` border + Feather `clock` 15 `muted`) · query (`text.rowTitle` 14/500) · meta (`muted` 12) · right Feather `search` 15 `subtle`
   - Rows: **"Stanford soccer"** (Sport · org) · **"D1 swimmers"** (Sport · division) · **"Sofia Martinez"** (Athlete)
5. **Suggested for you** — 3 athlete rows reusing the connection-row pattern but the right button is a primary **"+ Connect"** (`blue` bg, `#FFF` text, `pill`, padding `6/12`, 12/600, with Feather `plus` size 13/stroke 2.5)

---

### Auth gate (shared)

Renders when there is no session, in place of any tab's body content.

- Centered column, padding `0 28`, text-aligned center
- 64×64 ink square (`radius.2xl`, `shadow.ink`) with an 32 px AP shield
- Title (marginTop 20, `text.title2` 22/700, `text`, letter-spacing -0.3): **"Sign in to continue"**
- Body (`text.body` 14, `muted`, line-height 1.5, max-width 280):
  > "The *{tabLabel}* tab is private. Sign in to access your verified athletic identity."
- Primary CTA (marginTop 22): **"Sign in with Athlete Passport"** — blue pill, `shadow.ctaLg`
- Secondary CTA (marginTop 10): **"Create an account"** — transparent, `muted`, 13/500

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

> **Linear gradients** (used in the header and the Passport / Lock-hero cards) need `expo-linear-gradient`, which is included by default with Expo and does not count as a new dependency.
>
> **SVG primitives** (BlueCheck, ApMark, jersey stripes) need `react-native-svg`, also included with Expo.

---

## Interactions & behavior

- **Tab switching:** standard Expo Router. No cross-tab state; each screen owns its own data hooks.
- **Pending-request badge:** the `3` is sourced from `useConnections().pendingCount`. When it hits 0, omit the `badge` prop on `<Tabs.Screen name="connections">`.
- **Active tint:** label and icon swap to `colors.blue`; label weight goes from 500 → 700 (`text.tabLabel` → `text.tabLabelActive`).
- **Documents `Notify me`:** POST to `/api/notify-me`, show toast `"We'll email you when Sprint 4 ships."`, optimistically disable the button.
- **Search input:** debounce 200 ms before firing a query.
- **Auth gate:** if `useSession()` returns no session, return `<AuthGate tabLabel={...} />` early from each tab. Sign-in button starts the OAuth flow (out of scope this sprint — link to `app/(auth)/sign-in.tsx`).
- **Safe areas:** wrap each screen in `SafeAreaView` from `react-native-safe-area-context` (Expo bundled) with `edges={['top']}` — the dark header should extend behind the status bar but content must respect the notch. The tab bar bottom inset is handled by Expo Router automatically on iOS via the `paddingBottom: 20` we pass.

---

## State

Sprint 3 scope is presentation only; wire to backend later. Recommended hooks (to be implemented in `apps/mobile/lib/`):

```ts
useSession()       // { session: Session | null, signIn, signOut }
useProfile()       // { profile, isLoading, error }
useConnections()   // { connections, pending, pendingCount, accept, reject, message }
useSearchAthletes(q: string)
```

All four screens should render skeleton states while `isLoading` and an empty state if `data?.length === 0`. The Documents tab is a hard-coded placeholder — no fetch.

---

## Accessibility

- All tappable elements ≥ 44×44 (`minTouch`).
- Tab buttons get `accessibilityRole="tab"`, `accessibilityLabel="<label>"`, and `accessibilityState={{ selected: focused }}`.
- BlueCheck, VerifiedChip, PendingChip include an `accessibilityLabel` ("Verified", "Pending").
- Icon-only buttons (bell, lock dot) need explicit `accessibilityLabel`.

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
│       ├── documents.tsx           ← stub (locked state)
│       └── search.tsx              ← stub
└── design/
    ├── index.html                  ← interactive prototype (open in browser)
    ├── app.jsx
    ├── screens.jsx
    ├── ios-frame.jsx
    └── tweaks-panel.jsx
```

Open `design/index.html` in any modern browser to interact with the
prototype. The Tweaks toolbar inside the prototype lets you switch the
active tab, toggle the auth-gated state (login screen ↔ tabs), flip the
login-mode copy (sign-in ↔ create), and preview alternate accents.

---

## Out of scope (this sprint)

- Real OAuth wiring (Apple / Google SDKs) — flag with product before adding deps
- Profile **edit** mode
- Connection request actions wired to the backend
- Document upload / signing (Sprint 4)
- Search results screen (`app/search/results.tsx`)
- Push notifications
- Light/dark theme — the design is intentionally light-themed only (the sign-in screen is permanently dark by design)

---

## Definition of done

- [ ] Unauthenticated users land on `(auth)/sign-in` and never see the tab UI.
- [ ] `(tabs)/_layout.tsx` renders four tabs in the spec'd order with Feather icons; Connections shows badge `3`; Documents shows lock dot.
- [ ] Profile screen matches the prototype within ±2 px on iPhone 14 (375×812).
- [ ] Connections, Documents (locked), and Search render their static content.
- [ ] Successful sign-in routes to `(tabs)/profile`; sign-out routes back to `(auth)/sign-in`.
- [ ] No imports from `nativewind`, `tailwind*`, `styled-components`, or any new npm dependency outside the Expo SDK (Apple/Google SDKs flagged for follow-up sprint).
- [ ] `tsc --noEmit` passes under `"strict": true`.
