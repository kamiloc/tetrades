import { useConnections, useMyAthlete } from '@packages/api-client';
import { TAB_STATES, connectionsSubtitle, selectViewState } from '@packages/shared-logic';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '../../../components/Card';
import { EmptyRow } from '../../../components/EmptyRow';
import { PillButton } from '../../../components/PillButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SectionTitle } from '../../../components/SectionTitle';
import { TabSkeleton } from '../../../components/Skeleton';
import { StatePanel } from '../../../components/StatePanel';
import { Feather } from '../../../lib/icons';
import { isBusy, isFailed } from '../../../lib/query-state';
import { colors } from '../../../lib/theme';

const copy = TAB_STATES.connections;

// connection.listConnections returns accepted connections as bare ids only,
// with no pending-request listing. Until a connection API change lands, this
// tab shows the real count and the way to find athletes, never sample people.

function ConnectionsShell({ subtitle, children }: { subtitle: string; children: ReactElement }): ReactElement {
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Connections" subtitle={subtitle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-6 pt-4">
        {children}
      </ScrollView>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <ConnectionsShell subtitle={copy.sub.error}>
      <StatePanel
        tone="danger"
        icon="alert-circle"
        title={copy.error.title}
        body={copy.error.body}
        primary={{ label: copy.error.primary, onPress: onRetry }}
      />
    </ConnectionsShell>
  );
}

export default function ConnectionsScreen(): ReactElement {
  const myAthlete = useMyAthlete();
  if (isBusy(myAthlete)) {
    return (
      <ConnectionsShell subtitle={copy.sub.empty}>
        <TabSkeleton variant="list" />
      </ConnectionsShell>
    );
  }
  if (isFailed(myAthlete) || !myAthlete.data) {
    return <ErrorState onRetry={() => { void myAthlete.refetch(); }} />;
  }
  return <ConnectionsBody athleteId={myAthlete.data.athleteId} />;
}

function ConnectionsBody({ athleteId }: { athleteId: string }): ReactElement {
  const connections = useConnections(athleteId);
  const count = connections.data?.length ?? 0;
  const state = selectViewState({
    isLoading: isBusy(connections),
    isError: isFailed(connections),
    isEmpty: count === 0,
  });
  const findAthletes = (): void => router.push('/search');

  if (state === 'loading') {
    return (
      <ConnectionsShell subtitle={copy.sub.empty}>
        <TabSkeleton variant="list" />
      </ConnectionsShell>
    );
  }
  if (state === 'error') {
    return <ErrorState onRetry={() => { void connections.refetch(); }} />;
  }
  if (state === 'empty') {
    return (
      <ConnectionsShell subtitle={copy.sub.empty}>
        <View>
          <StatePanel
            icon="users"
            title={copy.empty.title}
            body={copy.empty.body}
            primary={{ label: copy.empty.primary, onPress: findAthletes }}
          />
          <View className="pt-5">
            <SectionTitle>Pending requests</SectionTitle>
            <Card>
              <EmptyRow icon="users">{copy.emptyRows.pending ?? 'No pending requests'}</EmptyRow>
            </Card>
          </View>
        </View>
      </ConnectionsShell>
    );
  }

  return (
    <ConnectionsShell subtitle={connectionsSubtitle(count)}>
      <View>
        <SectionTitle meta={`${count} total`}>Your network</SectionTitle>
        <Card className="flex-row items-center gap-3 p-3.5">
          <View className="h-11 w-11 items-center justify-center rounded-md bg-blue-tint">
            <Feather name="users" size={20} color={colors.blue} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-row-title text-text">{connectionsSubtitle(count)} in your network</Text>
            <Text className="mt-0.5 text-meta text-muted">Find more athletes you know.</Text>
          </View>
        </Card>
        <View className="pt-4">
          <PillButton label={copy.empty.primary} icon="search" onPress={findAthletes} fullWidth />
        </View>
      </View>
    </ConnectionsShell>
  );
}
