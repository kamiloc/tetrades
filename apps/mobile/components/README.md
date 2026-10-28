# Mobile components

Shared UI for the signed-in app and sign-in screen, built from the design handoff (`docs/design-handoff/`). Styling uses NativeWind classes generated from `lib/tokens.js`. Values NativeWind can't express (icon colors, SVG fills, gradients, shadows) come from `lib/theme.ts`, which reads the same tokens.

| Component | What it is | Tokens |
| --- | --- | --- |
| `ScreenHeader` | Dark gradient header: AP mark, brand, title, subtitle; back button on stack screens; decorative bell | `ink`/`ink2` gradient, `header-*`, `text-header-title`/`-subtitle`/`-brand` |
| `ApMark` | Shield wordmark (SVG) | `blue` |
| `Card` | White surface | `paper`, `line`, `rounded-xl`, `shadow.sm` |
| `SectionTitle` | Uppercase eyebrow plus an optional link, meta, or custom right slot | `text-eyebrow`, `muted`, `blue` |
| `Avatar` | Initials on a gradient with a jersey stripe; optional blue ring. `initialsOf`, `hueOf` helpers | `blue` ring |
| `BlueCheck` | Verified badge next to a name | `blue` |
| `Tag` | Small square tag, default or blue | `tag`, `line`, `blue-tint`, `blue-line` |
| `StatusChip` | Unverified, Pending, Verified, or Rejected pill, driven by `achievementChip` from `@packages/shared-logic`, with an accessible label | `canvas`/`muted`, `pending-*`, `blue-tint`/`blue`, `danger-*` |
| `PillButton` | Rounded action (primary, ghost, outline, danger, text), at least 44pt | `blue`, `line`, `blue-line`, `danger-line`, `shadow.cta` |
| `StatePanel` | Empty/error hero with primary and secondary actions; polite live region | `blue-line`/`blue-tint` or `danger-line`/`danger-tint`, `text-state-*` |
| `EmptyRow` | Dashed-icon row inside a section card | `dash`, `subtle`, `muted` |
| `OfflineBanner` | Danger-tint connectivity banner with Retry | `danger-tint`, `danger` |
| `TabSkeleton` | Loading placeholders (`profile`, `list`, `kpi` variants) | `segmented`, `Card` |
| `AchievementRow` | Status tile, title, meta, and `StatusChip`; optionally pressable | chip tones |
| `MSegmented` | Segmented control (radio group) for ranges and audiences | `segmented`, `rounded-segmented`, `paper` |
| `SpeedChart` | SVG line and area chart for one metric's entries; handles 0, 1, or many points | `blue`, `blue-tint`, `line` |
| `AuthButton` | Email sign-in button. The only provider: Apple and Google are intentionally not built (AGENTS.md: Magic Link + OTP only) | `blue`, CTA glow |
| `DateField` | Native date picker behind a field-styled button (Android dialog, iOS inline sheet). Value is `YYYY-MM-DD`. `locale`/button-label props for screens not yet in English. `toIsoDate`, `fromIsoDate` helpers | `line`, `danger`, `paper` |
| `KeyboardAwareScrollView` | ScrollView that pads by the keyboard overlap and scrolls the focused input into view (iOS and Android edge-to-edge, built-in APIs). `useKeyboardOverlap` for bottom sheets | none |
| `Toast` | `ToastProvider` (mounted in `app/_layout.tsx`), `useToast()` → `success(msg)` / `error(msg)`, and `ToastViewport`. Shows at the bottom, above the tab bar (root) or the keyboard. Add a `ToastViewport` inside any RN `Modal` or native modal screen that can show a toast. Auto-dismisses; announced to screen readers | `ink` (success), `danger-*` (error), `shadow.ink` |
| `spinner` (default export) | Full-screen activity indicator | `canvas` |

Icons come from `lib/icons.tsx` (`Feather`, backed by `@expo/vector-icons`). Add a name to `IconName` before using a new icon.
