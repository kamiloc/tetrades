import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Feather } from '../../lib/icons';
import { colors } from '../../lib/theme';

const shadowSm: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  android: { elevation: 1 },
  default: {},
}) ?? {};

const SPORTS = [
  'Soccer', 'Basketball', 'Football', 'Track & Field',
  'Volleyball', 'Baseball', 'Tennis', 'Swimming', 'Rowing', 'Lacrosse',
] as const;

const RECENT = [
  { query: 'Stanford soccer',  meta: 'Sport · org'      },
  { query: 'D1 swimmers',      meta: 'Sport · division' },
  { query: 'Sofia Martinez',   meta: 'Athlete'          },
] as const;

const SUGGESTED: Array<{ initials: string; name: string; verified: boolean; sport: string; org: string; hue: number }> = [
  { initials: 'TW', name: 'Tyler Wu',       verified: true,  sport: 'Basketball', org: 'Duke University',    hue: 210 },
  { initials: 'NL', name: 'Nadia Laurent',  verified: true,  sport: 'Swimming',   org: 'Texas Longhorns',    hue: 170 },
  { initials: 'RK', name: 'Ravi Kapoor',    verified: false, sport: 'Soccer',     org: 'Penn State Nittany', hue: 40  },
];

export default function SearchScreen() {
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
            Discover
          </Text>
          <Text
            className="text-footnote font-regular text-on-ink-muted mt-0.5 mb-5"
            style={{ letterSpacing: 0.1 }}
          >
            Find athletes &amp; teams
          </Text>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search field */}
        <View
          className="flex-row items-center gap-2 bg-paper rounded-lg border border-line px-3.5 py-[11px]"
          style={shadowSm}
        >
          <Feather name="search" size={18} color={colors.subtle} />
          <TextInput
            className="flex-1 font-regular text-text"
            style={{ fontSize: 14.5 }}
            placeholder="Search athletes by name or sport"
            placeholderTextColor={colors.subtle}
            editable
            returnKeyType="search"
            accessibilityLabel="Search athletes"
          />
          <View className="bg-canvas rounded-xs border border-line py-0.5 px-1.5">
            <Text className="text-caption font-regular text-muted">⌘K</Text>
          </View>
        </View>

        {/* Browse by sport */}
        <View className="mt-5">
          <Text
            className="text-small font-bold uppercase text-muted pb-2 px-1"
            style={{ letterSpacing: 1.7 }}
          >
            BROWSE BY SPORT
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((sport) => (
              <View key={sport} className="px-3.5 py-2 bg-paper rounded-pill border border-line" style={shadowSm}>
                <Text className="text-footnote font-medium text-text">{sport}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent searches */}
        <View className="mt-5">
          <View className="flex-row items-center justify-between pb-2 px-1">
            <Text
              className="text-small font-bold uppercase text-muted"
              style={{ letterSpacing: 1.7 }}
            >
              RECENT
            </Text>
            <Text className="text-small font-semibold text-blue pb-2">Clear</Text>
          </View>
          <View className="bg-paper rounded-xl border border-line" style={shadowSm}>
            {RECENT.map(({ query, meta }, index) => (
              <View key={query}>
                <View className="flex-row items-center px-3 py-3 gap-3">
                  <View className="w-8 h-8 rounded-md bg-canvas border border-line items-center justify-center">
                    <Feather name="clock" size={15} color={colors.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body font-medium text-text">{query}</Text>
                    <Text className="text-small font-regular text-muted mt-0.5">{meta}</Text>
                  </View>
                  <Feather name="search" size={15} color={colors.subtle} />
                </View>
                {index < RECENT.length - 1 ? <View className="h-px bg-line mx-3" /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Suggested for you */}
        <View className="mt-5">
          <Text
            className="text-small font-bold uppercase text-muted pb-2 px-1"
            style={{ letterSpacing: 1.7 }}
          >
            SUGGESTED FOR YOU
          </Text>
          <View className="bg-paper rounded-xl border border-line" style={shadowSm}>
            {SUGGESTED.map((athlete, index) => (
              <View key={athlete.name}>
                <View className="flex-row items-center px-3 py-3 gap-3">
                  <View
                    className="w-11 h-11 rounded-pill items-center justify-center"
                    style={{ backgroundColor: `hsl(${athlete.hue}, 60%, 50%)` }}
                  >
                    <Text className="text-body font-bold text-paper">{athlete.initials}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1">
                      <Text
                        className="text-body font-semibold text-text shrink"
                        numberOfLines={1}
                        style={{ lineHeight: 17.5 }}
                      >
                        {athlete.name}
                      </Text>
                      {athlete.verified ? (
                        <View className="w-3.5 h-3.5 rounded-pill bg-blue items-center justify-center">
                          <Feather name="check" size={9} color={colors.paper} accessibilityLabel="Verified" />
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-small font-regular text-muted mt-0.5">{athlete.sport}</Text>
                    <Text className="text-small font-regular text-subtle">{athlete.org}</Text>
                  </View>
                  <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-pill bg-blue">
                    <Feather name="plus" size={13} color={colors.paper} />
                    <Text className="text-small font-semibold text-paper">Connect</Text>
                  </View>
                </View>
                {index < SUGGESTED.length - 1 ? <View className="h-px bg-line mx-3" /> : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
