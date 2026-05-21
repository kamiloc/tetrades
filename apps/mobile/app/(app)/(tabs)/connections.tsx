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

const NETWORK: Array<{ initials: string; name: string; verified: boolean; sport: string; org: string; hue: number }> = [
  { initials: 'SM', name: 'Sofia Martinez', verified: true,  sport: 'Track & Field',  org: 'UCLA Athletics',         hue: 160 },
  { initials: 'JO', name: 'James Okafor',   verified: true,  sport: 'Basketball',     org: 'Duke University',        hue: 220 },
  { initials: 'AR', name: 'Amelia Reed',    verified: true,  sport: 'Volleyball',     org: 'USC Trojans',            hue: 280 },
  { initials: 'DB', name: 'Devon Brooks',   verified: false, sport: 'Football',       org: 'Ohio State',             hue: 30  },
  { initials: 'PS', name: 'Priya Shah',     verified: true,  sport: 'Swimming',       org: 'Stanford Athletics',     hue: 190 },
  { initials: 'LO', name: "Liam O'Connor",  verified: true,  sport: 'Soccer',         org: 'UCLA Bruins',            hue: 350 },
];

export default function ConnectionsScreen() {
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
            Connections
          </Text>
          <Text
            className="text-footnote font-regular text-on-ink-muted mt-0.5 mb-5"
            style={{ letterSpacing: 0.1 }}
          >
            247 athletes · 3 pending
          </Text>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Pending requests */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between pb-2 px-1">
            <Text
              className="text-small font-bold uppercase text-muted"
              style={{ letterSpacing: 1.7 }}
            >
              PENDING REQUESTS
            </Text>
            <Text className="text-small font-semibold text-blue">Manage</Text>
          </View>
          <View className="bg-paper rounded-xl border border-line" style={shadowSm}>
            <View className="flex-row items-center px-3.5 py-3.5 gap-3">
              <View className="flex-row w-[76px]">
                <View className="w-9 h-9 rounded-pill items-center justify-center border-2 border-paper bg-blue">
                  <Text className="text-small font-bold text-paper">K</Text>
                </View>
                <View className="-ml-2.5 w-9 h-9 rounded-pill items-center justify-center border-2 border-paper bg-pending">
                  <Text className="text-small font-bold text-paper">Z</Text>
                </View>
                <View className="-ml-2.5 w-9 h-9 rounded-pill items-center justify-center border-2 border-paper bg-muted">
                  <Text className="text-small font-bold text-paper">E</Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-body font-semibold text-text" style={{ lineHeight: 17.5 }}>
                  3 athletes want to connect
                </Text>
                <Text className="text-small font-regular text-muted mt-0.5">Kai, Zara, Ethan</Text>
              </View>
              <View className="min-w-[22px] h-[22px] rounded-pill bg-blue items-center justify-center px-[7px]">
                <Text className="text-small font-bold text-paper">3</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Network list */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between pb-2 px-1">
            <Text
              className="text-small font-bold uppercase text-muted"
              style={{ letterSpacing: 1.7 }}
            >
              YOUR NETWORK
            </Text>
            <Text className="text-small font-regular text-muted">247 total</Text>
          </View>
          <View className="bg-paper rounded-xl border border-line" style={shadowSm}>
            {NETWORK.map((athlete, index) => (
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
                  <View className="px-3 py-1.5 rounded-pill border border-blue-line bg-paper">
                    <Text className="text-small font-semibold text-blue">Message</Text>
                  </View>
                </View>
                {index < NETWORK.length - 1 ? <View className="h-px bg-line mx-3" /> : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
