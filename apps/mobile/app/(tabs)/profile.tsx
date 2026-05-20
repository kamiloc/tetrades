import { Feather } from '@expo/vector-icons';
import { Platform, ScrollView, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const shadowSm: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  android: { elevation: 1 },
  default: {},
}) ?? {};

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-canvas">
      {/* Fixed dark header */}
      <View className="bg-ink px-5 pb-3">
        <SafeAreaView edges={['top']}>
          <View className="h-8 mt-1.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <View className="w-[18px] h-[18px] rounded-xs bg-header-chip-bg border border-header-chip-border" />
              <Text
                className="text-caption font-semibold uppercase text-on-ink-muted"
                style={{ letterSpacing: 2.4 }}
              >
                THE ATHLETE PASSPORT
              </Text>
            </View>
            <View className="w-8 h-8 rounded-sm bg-header-chip-bg border border-header-chip-border items-center justify-center">
              <Feather name="bell" size={16} color="#FFFFFF" accessibilityLabel="Notifications" />
            </View>
          </View>
          <Text
            className="text-title1 font-bold text-on-ink mt-3"
            style={{ letterSpacing: -0.4, lineHeight: 29.9 }}
          >
            Profile
          </Text>
          <Text
            className="text-footnote font-regular text-on-ink-muted mt-0.5 mb-5"
            style={{ letterSpacing: 0.1 }}
          >
            Your athlete identity
          </Text>
        </SafeAreaView>
      </View>

      {/* Scrollable body — identity card overlaps header by 20 px */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View className="bg-paper rounded-xl border border-line -mt-5 pt-5 px-[18px] pb-[18px]" style={shadowSm}>
          <View className="flex-row items-center gap-3.5">
            <View
              className="w-[68px] h-[68px] rounded-pill bg-blue items-center justify-center border-paper"
              style={{ borderWidth: 3 }}
            >
              <Text className="text-title3 font-bold text-paper">MC</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1">
                <Text
                  className="text-title3 font-bold text-text"
                  style={{ letterSpacing: -0.2, lineHeight: 21.85 }}
                >
                  Marcus Chen
                </Text>
                <View className="w-4 h-4 rounded-pill bg-blue items-center justify-center">
                  <Feather name="check" size={9} color="#FFFFFF" accessibilityLabel="Verified" />
                </View>
              </View>
              <Text className="text-small font-regular text-muted mt-1">
                Midfielder · Soccer
              </Text>
              <View className="flex-row gap-2 mt-2 flex-wrap">
                <View className="px-2 py-1 bg-canvas rounded-sm border border-line">
                  <Text className="text-caption font-medium text-text">Stanford Cardinal</Text>
                </View>
                <View className="px-2 py-1 bg-blue-tint rounded-sm border border-blue-line">
                  <Text className="text-caption font-medium text-blue">NCAA D1</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="h-px bg-line mt-[18px]" />

          {/* Stats row */}
          <View className="flex-row pt-3">
            <View className="flex-1 items-center">
              <Text className="text-callout font-bold text-text" style={{ letterSpacing: -0.2 }}>
                6'1"
              </Text>
              <Text
                className="text-caption font-semibold uppercase text-muted mt-0.5"
                style={{ letterSpacing: 0.2 }}
              >
                HEIGHT
              </Text>
            </View>
            <View className="flex-1 items-center border-l border-l-line pl-3.5">
              <Text className="text-callout font-bold text-text" style={{ letterSpacing: -0.2 }}>
                178 lb
              </Text>
              <Text
                className="text-caption font-semibold uppercase text-muted mt-0.5"
                style={{ letterSpacing: 0.2 }}
              >
                WEIGHT
              </Text>
            </View>
            <View className="flex-1 items-center border-l border-l-line pl-3.5">
              <Text className="text-callout font-bold text-blue" style={{ letterSpacing: -0.2 }}>
                247
              </Text>
              <Text
                className="text-caption font-semibold uppercase text-muted mt-0.5"
                style={{ letterSpacing: 0.2 }}
              >
                CONNECTIONS
              </Text>
            </View>
          </View>
        </View>

        {/* About section */}
        <View className="mt-5">
          <Text
            className="text-small font-bold uppercase text-muted pb-2 px-1"
            style={{ letterSpacing: 1.7 }}
          >
            ABOUT
          </Text>
          <View className="bg-paper rounded-xl border border-line" style={shadowSm}>
            <Text
              className="text-body-lg font-regular text-text px-3 pt-[14px]"
              style={{ lineHeight: 23.25 }}
            >
              Center mid at Stanford. PAC-12 All-Conference 2024. Two-footed playmaker focused on tempo control and final-third creation. Records verified through Athlete Passport since 2023.
            </Text>
            <View className="flex-row gap-3.5 px-3 pt-3 pb-3.5">
              <View className="flex-row items-center gap-1">
                <Feather name="map-pin" size={13} color="#6B7280" />
                <Text className="text-small font-regular text-muted">Palo Alto, CA</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Feather name="clock" size={13} color="#6B7280" />
                <Text className="text-small font-regular text-muted">Joined Aug 2023</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements section */}
        <View className="mt-5">
          <View className="flex-row items-center justify-between pb-2 px-1">
            <Text
              className="text-small font-bold uppercase text-muted"
              style={{ letterSpacing: 1.7 }}
            >
              ACHIEVEMENTS
            </Text>
            <Text className="text-small font-semibold text-blue">See all</Text>
          </View>
          <View className="bg-paper rounded-xl border border-line" style={shadowSm}>
            <AchievementRow
              icon="check"
              iconColor="#1A6BFF"
              tileBg="#E8F0FF"
              title="PAC-12 All-Conference"
              meta="2024 · Stanford Athletics"
              status="verified"
              showDivider
            />
            <AchievementRow
              icon="check"
              iconColor="#1A6BFF"
              tileBg="#E8F0FF"
              title="U.S. Youth National Team — Player Pool"
              meta="2023 · U.S. Soccer"
              status="verified"
              showDivider
            />
            <AchievementRow
              icon="clock"
              iconColor="#B5651D"
              tileBg="#FFF3E0"
              title="Combine: 40-yd dash · 4.61s"
              meta="2025 · Bay Area Showcase"
              status="pending"
              showDivider
            />
            <AchievementRow
              icon="check"
              iconColor="#1A6BFF"
              tileBg="#E8F0FF"
              title="Annual Physical — Cleared"
              meta="Mar 2025 · Stanford Sports Med"
              status="verified"
              showDivider={false}
            />
          </View>
        </View>

        {/* Passport completeness */}
        <View className="mt-5">
          <View className="bg-paper rounded-xl border border-blue-line" style={shadowSm}>
            <View className="flex-row items-center px-3 py-3.5 gap-3">
              <View className="w-10 h-10 rounded-md bg-blue-tint items-center justify-center">
                <Feather name="shield" size={20} color="#1A6BFF" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-body font-semibold text-text"
                  style={{ lineHeight: 17.5 }}
                >
                  Passport 82% complete
                </Text>
                <View className="h-1.5 bg-blue-line rounded-pill mt-2 overflow-hidden">
                  <View className="w-[82%] h-1.5 bg-blue rounded-pill" />
                </View>
              </View>
              <View className="px-3.5 py-[7px] rounded-pill border border-line bg-paper">
                <Text className="text-small font-semibold text-text">Finish</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Inline sub-component (no state, no hooks) ─────────────────────
function AchievementRow({
  icon,
  iconColor,
  tileBg,
  title,
  meta,
  status,
  showDivider,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  tileBg: string;
  title: string;
  meta: string;
  status: 'verified' | 'pending';
  showDivider: boolean;
}) {
  const isVerified = status === 'verified';
  return (
    <>
      <View className="flex-row items-center px-3 py-3 gap-3">
        <View
          className="w-[34px] h-[34px] rounded-md items-center justify-center"
          style={{ backgroundColor: tileBg }}
        >
          <Feather name={icon} size={17} color={iconColor} accessibilityLabel={isVerified ? 'Verified' : 'Pending'} />
        </View>
        <View className="flex-1">
          <Text
            className="text-body font-semibold text-text"
            numberOfLines={2}
            style={{ lineHeight: 17.5 }}
          >
            {title}
          </Text>
          <Text className="text-small font-regular text-muted mt-0.5">{meta}</Text>
        </View>
        {isVerified ? (
          <View className="px-2 py-1 bg-blue-tint rounded-pill border border-blue-line">
            <Text
              className="text-caption font-semibold uppercase text-blue"
              style={{ letterSpacing: 0.2 }}
            >
              VERIFIED
            </Text>
          </View>
        ) : (
          <View className="px-2 py-1 bg-pending-tint rounded-pill">
            <Text
              className="text-caption font-semibold uppercase text-pending"
              style={{ letterSpacing: 0.2 }}
            >
              PENDING
            </Text>
          </View>
        )}
      </View>
      {showDivider ? <View className="h-px bg-line mx-3" /> : null}
    </>
  );
}
