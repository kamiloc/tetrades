// apps/mobile/app/(tabs)/performance.tsx
// Performance — athlete's season metrics, benchmarks, and verified tests.
//
// Layout (375 px, scrollable, colors.canvas, horizontal padding space.lg):
//   1. <ScreenHeader title="Performance" subtitle="Season 2026 · Midfielder" />
//   2. PF_KPI — two-column KPI card grid. Preserve each label, value, unit,
//      comparison, icon, and accent from design/screens-2.jsx.
//   3. Speed section — <SpeedChart values={PF_SPEED} months={PF_MONTHS} />.
//      Draw the chart with react-native-svg only (no chart library); match
//      the prototype's line, grid, fill, labels, and point placement.
//   4. PF_BENCH — percentile bars. Keep source labels, percentile values,
//      track/fill colors, spacing, and marker placement.
//   5. PF_TESTS — metric test rows with <VerifiedChip /> or <PendingChip />.
//   6. <MSegmented /> — segmented control at the final position shown in
//      screens-2.jsx; use colors.segmented and radius.segmented.
//
// Data behavior (wire usePerformance() from apps/mobile/lib/):
//   const { data, isLoading, error, refetch } = usePerformance();
//   if (isLoading) return <PerformanceSkeleton />;
//   if (error) return <PerformanceError onRetry={refetch} />;
//   if (!data?.length) return <PerformanceEmpty />;
//   return <PerformanceLoaded data={data} />;
// Empty/error copy and subtitle are defined by TAB_STATES in design/states.jsx.
//
// Tokens: colors.ink/ink2, canvas, paper, line, text, muted, subtle, blue,
// blueTint, blueLine, danger set and dash; radius.xl, radius.segmented,
// space.lg/xl/2xl; text.headerLargeTitle, headerSubtitle, sectionEyebrow,
// rowTitle, meta, statValue and chip. Chart points/series come from PF_*.

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';
// import { usePerformance } from '@/lib/hooks';
// import { ScreenHeader, PerformanceSkeleton, PerformanceError, PerformanceEmpty,
//   PerformanceLoaded } from '@/components';

export default function PerformanceScreen() {
  // const { data, isLoading, error, refetch } = usePerformance();
  // if (isLoading) return <PerformanceSkeleton />;
  // if (error) return <PerformanceError onRetry={refetch} />;
  // if (!data?.length) return <PerformanceEmpty />;

  return (
    <View style={styles.root}>
      {/* <ScreenHeader title="Performance" subtitle="Season 2026 · Midfielder" /> */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* <PerformanceKpiGrid items={PF_KPI} /> */}
        {/* <SpeedChart values={PF_SPEED} months={PF_MONTHS} /> */}
        {/* <PerformanceBenchmarks items={PF_BENCH} /> */}
        {/* <PerformanceTests items={PF_TESTS} /> */}
        {/* <MSegmented ... /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX, paddingTop: space.lg },
});
