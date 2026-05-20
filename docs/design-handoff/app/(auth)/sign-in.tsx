// apps/mobile/app/(auth)/sign-in.tsx
// Login screen — full-bleed dark hero.
//
// Visual reference: design/index.html, with the "Authenticated" tweak OFF.
// Toggle the "Login mode" tweak between "Sign in" and "Create" to see both
// copy variants (the layout is identical — only headline + button labels swap).
//
// Routing
// ───────
// This route lives in the (auth) group, OUTSIDE the (tabs) group:
//
//   app/
//   ├── (auth)/
//   │   └── sign-in.tsx     ← this file
//   ├── (tabs)/             ← only reachable when signed in
//   └── _root_layout.tsx    ← redirects based on session
//
// In the root layout, use a `<Stack.Protected>` (or a manual <Redirect />)
// to push the user to `(auth)/sign-in` whenever `useSession()` returns no
// session, and back to `(tabs)/profile` once `signIn()` resolves.
//
// Layout (375 px wide, full height)
// ─────────────────────────────────
//  Background: radial-gradient(120% 80% at 50% 0%,
//                              #1B2845 0%, colors.ink 55%, #050811 100%)
//  + a faint diagonal "field lines" pattern (repeating-linear-gradient
//    at 120°, 1px white-50% stripes every 28 px, 0.08 opacity)
//  + a soft blue radial glow in the top-left (rgba(26,107,255,0.35) → transparent)
//
//  Top block (paddingTop: 47 + 56, paddingX: 28):
//    - 56×56 brand tile — radius 16, bg rgba(26,107,255,0.16),
//      border 1px rgba(26,107,255,0.35), shadow.ink + inset white 1px
//      <ApMark size={28} /> centered
//    - eyebrow "THE ATHLETE PASSPORT" — text.headerBrand, white 55%
//    - <Text style={display}> headline (32/700, ls -0.6, line 1.1, white):
//        signin → "Welcome back,\nathlete."
//        create → "Build your verified\nathletic identity."
//    - body (14.5, white 62%, line 1.5, max-width 300):
//        signin → "Sign in to your verified records, network, and document vault."
//        create → "Cryptographically signed physicals, clearances, and stats —
//                  owned by you, shareable with coaches and teams."
//    - 3 value-prop rows (gap 12):
//        shield · "Records signed by team medical staff"
//        users  · "A trusted network of athletes & coaches"
//        lock   · "End-to-end secure · athlete-owned"
//      Each row: 28×28 tile (radius 8, bg white-6%, border white-10%) +
//      Feather icon size 15 white-78%, then label 13.5 white-78%.
//
//  Bottom block (marginTop: auto, paddingX: 20, gap 10):
//    - <AuthButton variant="apple"  label="Sign in with Apple"  />
//    - <AuthButton variant="google" label="Sign in with Google" />
//    - <AuthButton variant="email"  label="Sign in with email"  />
//        height 50, radius 12, fontSize 15, fontWeight 600.
//        apple:  bg #000, color #fff, border 1px rgba(255,255,255,0.12)
//        google: bg #fff, color colors.text
//        email:  bg colors.blue, color #fff, shadow #1A6BFF 0/6 · 0.40 · 18
//    - footer row (13.5, white-62%, centered):
//        signin → "New to Athlete Passport? <a>Create account</a>"
//        create → "Already a member? <a>Sign in</a>"
//    - terms microcopy (11.5, white-42%, centered, line 1.5):
//        "By continuing you agree to our Terms & Privacy Policy."
//  Bottom 34 px is the home-indicator safe area (let SafeAreaView handle it).
//
// Provider buttons
// ────────────────
// The prototype renders neutral monogram placeholders. For production,
// USE the official SDKs which ship the canonical, locale-correct buttons:
//   - Apple:  `expo-apple-authentication` → <AppleAuthentication.AppleAuthenticationButton>
//   - Google: `@react-native-google-signin/google-signin` (or Expo Auth Session
//             with the Google provider) — these are NOT in the no-new-deps
//             constraint; flag with @product before adding.
// Until then, keep neutral text-only buttons.
//
// Behavior
// ────────
// onPress → signIn(provider) → on success, router.replace('/(tabs)/profile')
// On failure, show an inline error banner above the button stack
// (text: "Couldn't sign you in. Try again.", padding 12, radius 10,
//  bg rgba(229, 92, 92, 0.12), border rgba(229, 92, 92, 0.3), color #FCA5A5).

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, space } from '@/tokens';
// import { useSession } from '@/lib/auth';
// import { Feather } from '@expo/vector-icons';
// import { ApMark } from '@/components/ApMark';
// import { ValueProp } from '@/components/ValueProp';
// import { AuthButton } from '@/components/AuthButton';

type Mode = 'signin' | 'create';

export default function SignInScreen({ mode = 'signin' as Mode }) {
  // const { signIn } = useSession();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1B2845', colors.ink, '#050811']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* TODO: <FieldLinesOverlay />, <GlowBlob /> */}

      <View style={styles.top}>
        {/* TODO: brand tile + ApMark + eyebrow + headline + body + value props */}
      </View>

      <View style={styles.bottom}>
        {/* TODO: <AuthButton variant="apple" /> ×3, footer row, terms note */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  top:  { paddingTop: 47 + 56, paddingHorizontal: 28 },
  bottom: { marginTop: 'auto', paddingHorizontal: space.xl, gap: 10, paddingBottom: space.md },
});
