// apps/mobile/app/(tabs)/clubs.tsx
// Clubs & trainers — club invitations, active club history, and club trainers.
//
// Layout (375 px, scrollable, colors.canvas, horizontal padding space.lg):
//   1. <ScreenHeader title="Clubs & trainers" subtitle from TAB_STATES />
//   2. Club invitations — show the inviting club and trainer. The athlete
//      accepts or declines; only acceptance activates membership.
//   3. Active club history — render CL_HIST. Pending and rejected invitations
//      never appear in public profile or public club roster views.
//   4. Trainers at your clubs — show trainer assignments for active clubs.
//      This list does not imply access to athlete private-profile data.
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
        {/* <ClubInvitations items={CL_REQ} onAccept={...} onDecline={...} /> */}
        {/* <ClubTimeline items={CL_HIST} /> */}
        {/* <ClubTrainerList items={CL_STAFF} /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX, paddingTop: space.lg },
});
