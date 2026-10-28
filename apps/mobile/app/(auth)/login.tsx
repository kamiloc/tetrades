import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ApMark } from '../../components/ApMark';
import { AuthButton } from '../../components/AuthButton';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { sendLoginMagicLink } from '../../lib/auth-actions';
import type { IconName } from '../../lib/icons';
import { Feather } from '../../lib/icons';
import { colors, shadow } from '../../lib/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGN_IN_FAILED = "Couldn't sign you in. Try again.";

const ERROR_PARAM_MAP: Readonly<Record<string, string>> = {
  link_expired: 'That sign-in link expired. Request a new one.',
  link_invalid: "That sign-in link isn't valid. Try again.",
};

type Mode = 'signin' | 'create';

const COPY: Record<Mode, { headline: string; body: string; footer: string; footerAction: string }> = {
  signin: {
    headline: 'Welcome back,\nathlete.',
    body: 'Sign in to your verified record, network, and club stats.',
    footer: 'New to Athlete Passport?',
    footerAction: 'Create account',
  },
  create: {
    headline: 'Build your verified\nathletic identity.',
    body: 'Verified achievements, club history, and trainer-reported stats — owned by you, shared on your terms.',
    footer: 'Already a member?',
    footerAction: 'Sign in',
  },
};

const VALUE_PROPS: ReadonlyArray<{ icon: IconName; label: string }> = [
  { icon: 'shield', label: "Stats reported by your club's trainers" },
  { icon: 'users', label: 'A trusted network of athletes & coaches' },
  { icon: 'lock', label: 'Secure and athlete-owned' },
];

// Radial ink background, faint diagonal field lines, and a blue glow (handoff §0).
function Backdrop(): ReactElement {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" accessible={false}>
      <Defs>
        <RadialGradient id="bg" cx="50%" cy="0%" rx="120%" ry="80%" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="#1B2845" />
          <Stop offset="0.55" stopColor={colors.ink} />
          <Stop offset="1" stopColor="#050811" />
        </RadialGradient>
        <RadialGradient id="glow" cx="15%" cy="8%" r="45%">
          <Stop offset="0" stopColor={colors.blue} stopOpacity="0.35" />
          <Stop offset="1" stopColor={colors.blue} stopOpacity="0" />
        </RadialGradient>
        <Pattern id="lines" width={28} height={28} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <Line x1={0} y1={0} x2={0} y2={28} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bg)" />
      <Rect width="100%" height="100%" fill="url(#lines)" opacity={0.08} />
      <Rect width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

// Email only: Magic Link with OTP fallback (AGENTS.md Auth rules). The
// handoff's Apple and Google buttons are intentionally not built.
export default function LoginScreen(): ReactElement {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ error?: string }>();
  const errorParam = Array.isArray(rawParams.error) ? (rawParams.error[0] ?? undefined) : rawParams.error;

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!errorParam) return;
    setError(ERROR_PARAM_MAP[errorParam] ?? SIGN_IN_FAILED);
  }, [errorParam]);

  const handleSubmit = async (): Promise<void> => {
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await sendLoginMagicLink({ email: trimmed, emailRedirectTo: 'athletepassport://verify' });
    } catch {
      setIsLoading(false);
      setError(SIGN_IN_FAILED);
      return;
    }
    setIsLoading(false);
    router.push(`/verify?email=${encodeURIComponent(trimmed)}`);
  };

  const copy = COPY[mode];
  const isDisabled = email.trim() === '' || isLoading;

  return (
    <View className="flex-1 bg-ink">
      <Backdrop />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <KeyboardAwareScrollView contentContainerClassName="grow">
            {/* Top block */}
            <View className="px-7 pt-14">
              <View
                className="h-14 w-14 items-center justify-center rounded-xl border"
                style={[shadow.ink, { backgroundColor: 'rgba(26,107,255,0.16)', borderColor: 'rgba(26,107,255,0.35)' }]}
              >
                <ApMark size={28} />
              </View>
              <Text className="mt-6 text-header-brand uppercase text-on-ink-muted">The Athlete Passport</Text>
              <Text accessibilityRole="header" className="mt-2 text-[32px] font-bold leading-[35px] tracking-[-0.6px] text-white">
                {copy.headline}
              </Text>
              <Text className="mt-3 max-w-[300px] text-body-copy text-white/60">{copy.body}</Text>
              <View className="mt-6 gap-3">
                {VALUE_PROPS.map((prop) => (
                  <View key={prop.label} className="flex-row items-center gap-3">
                    <View className="h-7 w-7 items-center justify-center rounded-[8px] border border-white/10 bg-white/5">
                      <Feather name={prop.icon} size={15} color="rgba(255,255,255,0.78)" />
                    </View>
                    <Text className="text-[13.5px] text-white/80">{prop.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bottom block */}
            <View className="mt-auto gap-2.5 px-5 pb-4 pt-8">
              {error !== null ? (
                <View
                  accessibilityLiveRegion="polite"
                  className="rounded-lg border px-3 py-2.5"
                  style={{ backgroundColor: 'rgba(229,92,92,0.12)', borderColor: 'rgba(229,92,92,0.3)' }}
                >
                  <Text className="text-footnote text-[#FCA5A5]">{error}</Text>
                </View>
              ) : null}
              <TextInput
                className="h-[50px] rounded-lg border border-white/15 bg-white/10 px-4 text-body-lg text-white"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.45)"
                accessibilityLabel="Email address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error !== null) setError(null);
                }}
                onSubmitEditing={() => { void handleSubmit(); }}
                editable={!isLoading}
                returnKeyType="send"
              />
              <AuthButton label="Continue with email" onPress={() => { void handleSubmit(); }} loading={isLoading} disabled={isDisabled} />
              <View className="mt-2 flex-row items-center justify-center">
                <Text className="text-[13.5px] text-white/60">{copy.footer} </Text>
                <Pressable
                  onPress={() => setMode(mode === 'signin' ? 'create' : 'signin')}
                  accessibilityRole="button"
                  hitSlop={12}
                  className="min-h-[44px] justify-center"
                >
                  <Text className="text-[13.5px] font-bold text-white">{copy.footerAction}</Text>
                </Pressable>
              </View>
              <Text className="text-center text-[11.5px] text-white/40">
                By continuing you agree to our Terms & Privacy Policy.
              </Text>
            </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
