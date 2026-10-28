import type { ReactElement } from 'react';
import { View } from 'react-native';

import { Card } from './Card';

function Block({ className }: { className: string }): ReactElement {
  return <View className={`rounded-md bg-segmented ${className}`} />;
}

function ListCardSkeleton({ rows }: { rows: number }): ReactElement {
  return (
    <Card>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} className={`flex-row items-center gap-3 px-4 py-3 ${index < rows - 1 ? 'border-b border-line' : ''}`}>
          <Block className="h-[34px] w-[34px]" />
          <View className="flex-1 gap-1.5">
            <Block className="h-3.5 w-2/3" />
            <Block className="h-3 w-1/3" />
          </View>
        </View>
      ))}
    </Card>
  );
}

// Placeholder layouts shown while a tab's data loads.
export function TabSkeleton({ variant }: { variant: 'profile' | 'list' | 'kpi' }): ReactElement {
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      className="gap-5 px-4 pt-4"
    >
      {variant === 'profile' ? (
        <Card className="p-5">
          <View className="flex-row items-center gap-3.5">
            <View className="h-[68px] w-[68px] rounded-full bg-segmented" />
            <View className="flex-1 gap-2">
              <Block className="h-5 w-1/2" />
              <Block className="h-3 w-1/3" />
            </View>
          </View>
        </Card>
      ) : null}
      {variant === 'kpi' ? (
        <View className="flex-row flex-wrap gap-2.5">
          {[0, 1, 2, 3].map((n) => (
            <Card key={n} className="w-[47%] grow p-3.5">
              <Block className="h-3 w-1/2" />
              <Block className="mt-2 h-6 w-1/3" />
            </Card>
          ))}
        </View>
      ) : null}
      <ListCardSkeleton rows={3} />
    </View>
  );
}
