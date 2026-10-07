// apps/mobile/app/(tabs)/clubs.tsx
// Clubs & trainers — athlete-controlled club history and trainer access.
//
// Layout (375 px, scrollable, colors.canvas, horizontal padding space.lg):
//   1. <ScreenHeader title="Clubs & trainers"
//      subtitle="3 clubs · 2 trainer requests" />
//   2. Trainer requests section — CL_REQ rows, each showing trainer identity,
//      club, and the permission chips shown in design/screens-2.jsx.
//   3. Club history section — CL_HIST timeline. Visually mark the current club
//      with the source's flag treatment and preserve source chronology/copy.
//   4. Staff access section — CL_STAFF rows with name, role, club, and access
//      presentation as shown in the prototype.
//
// Data behavior (wire useClubs() from apps/mobile/lib/):
//   const { data, isLoading, error, refetch } = useClubs();
//   if (isLoading) return <ClubsSkeleton />;
//   if (error) return <ClubsError onRetry={refetch} />;
//   if (!data?.length) return <ClubsEmpty />;
//   return <ClubsLoaded data={data} />;
// Empty/error copy and subtitle are defined by TAB_STATES in design/states.jsx.
//
// Tokens: colors.ink/ink2, canvas, paper, line, text, muted, subtle, blue,
// blueTint, blueLine, pending, pendingTint, danger set and dash; radius.xl,
// radius.md, radius.pill; space.lg/xl/2xl; text.headerLargeTitle,
// headerSubtitle, sectionEyebrow, rowTitle, meta and chip.

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';
// import { useClubs } from '@/lib/hooks';
// import { ScreenHeader, ClubsSkeleton, ClubsError, ClubsEmpty, ClubsLoaded } from '@/components';

export default function ClubsScreen() {
  // const { data, isLoading, error, refetch } = useClubs();
  // if (isLoading) return <ClubsSkeleton />;
  // if (error) return <ClubsError onRetry={refetch} />;
  // if (!data?.length) return <ClubsEmpty />;

  return (
    <View style={styles.root}>
      {/* <ScreenHeader title="Clubs & trainers" subtitle="3 clubs · 2 trainer requests" /> */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* <TrainerRequests items={CL_REQ} /> */}
        {/* <ClubTimeline items={CL_HIST} /> */}
        {/* <StaffAccessList items={CL_STAFF} /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX, paddingTop: space.lg },
});
