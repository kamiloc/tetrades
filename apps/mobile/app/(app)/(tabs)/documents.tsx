import { Platform, ScrollView, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Feather } from '../../../lib/icons';
import { colors } from '../../../lib/theme';

const shadowSm: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  android: { elevation: 1 },
  default: {},
}) ?? {};

const shadowCta: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#1A6BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
  android: { elevation: 4 },
  default: {},
}) ?? {};

const shadowInk: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#0B1220', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20 },
  android: { elevation: 6 },
  default: {},
}) ?? {};

const PREVIEW_DOCS = [
  'Annual Physical Examination',
  'ECG · Cardiac Screening',
  'Concussion Baseline (ImPACT)',
  'Orthopedic Clearance',
] as const;

export default function DocumentsScreen() {
  return (
    <View className="flex-1 bg-canvas">
      {/* Dark header */}
      <View className="bg-ink px-5 pb-3">
        <SafeAreaView edges={['top']}>
          <View className="h-8 mt-1.5 flex-row items-center">
            <View className="flex-row items-center gap-1">
              <View className="w-[18px] h-[18px] rounded-xs bg-header-chip-bg border border-header-chip-border" />
              <Text
                className="text-caption font-semibold uppercase text-on-ink-muted"
                style={{ letterSpacing: 2.4 }}
              >
                THE ATHLETE PASSPORT
              </Text>
            </View>
          </View>
          <Text
            className="text-title1 font-bold text-on-ink mt-3"
            style={{ letterSpacing: -0.4, lineHeight: 29.9 }}
          >
            Documents
          </Text>
          <Text
            className="text-footnote font-regular text-on-ink-muted mt-0.5 mb-5"
            style={{ letterSpacing: 0.1 }}
          >
            Verified medical records
          </Text>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pt-6 pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Lock hero card */}
        <View
          className="bg-paper rounded-xl border border-blue-line items-center px-[18px] py-[22px]"
          style={shadowSm}
        >
          <View
            className="w-14 h-14 rounded-xl bg-ink items-center justify-center"
            style={shadowInk}
          >
            <Feather name="lock" size={26} color={colors.paper} accessibilityLabel="Locked" />
          </View>
          <Text
            className="text-small font-bold uppercase text-blue mt-[14px]"
            style={{ letterSpacing: 1.7 }}
          >
            SPRINT 4 · COMING SOON
          </Text>
          <Text
            className="text-title3 font-bold text-text mt-2 text-center"
            style={{ letterSpacing: -0.2, lineHeight: 21.85 }}
          >
            Verified medical records
          </Text>
          <Text
            className="text-footnote font-regular text-muted mt-2 text-center max-w-[280px]"
            style={{ lineHeight: 19.5 }}
          >
            Securely upload physicals, ECGs, and clearance forms. Cryptographically signed by your team's medical staff.
          </Text>
          <View className="mt-4 px-5 py-2.5 rounded-pill bg-blue" style={shadowCta}>
            <Text
              className="text-footnote font-semibold text-paper"
              style={{ letterSpacing: 0.1 }}
            >
              Notify me when ready
            </Text>
          </View>
        </View>

        {/* Locked preview list */}
        <View className="mt-5">
          <Text
            className="text-small font-bold uppercase text-muted pb-2 px-1"
            style={{ letterSpacing: 1.7 }}
          >
            PREVIEW · LOCKED
          </Text>
          <View className="bg-paper rounded-xl border border-line opacity-70" style={shadowSm}>
            {PREVIEW_DOCS.map((doc, index) => (
              <View key={doc}>
                <View className="flex-row items-center px-3 py-3 gap-3">
                  <View className="w-[38px] h-11 rounded-md bg-canvas border border-line items-center justify-center">
                    <Feather name="lock" size={14} color={colors.subtle} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-body font-semibold text-text"
                      numberOfLines={1}
                      style={{ lineHeight: 17.5 }}
                    >
                      {doc}
                    </Text>
                    <Text className="text-small font-regular text-muted mt-0.5">
                      Locked until Sprint 4
                    </Text>
                  </View>
                  <Feather name="lock" size={16} color={colors.subtle} />
                </View>
                {index < PREVIEW_DOCS.length - 1 ? <View className="h-px bg-line mx-3" /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Footer note */}
        <Text
          className="text-caption font-regular text-subtle mt-3 px-2"
          style={{ lineHeight: 16.5 }}
        >
          Document uploads, signing, and sharing will arrive in Sprint 4. Today this tab is a placeholder.
        </Text>
      </ScrollView>
    </View>
  );
}
