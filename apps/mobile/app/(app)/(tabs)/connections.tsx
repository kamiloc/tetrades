import { useConnections, useMyAthlete } from '@packages/api-client';
import { selectViewState } from '@packages/shared-logic';
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
import { useMobileLocalization } from '../../../lib/i18n';
import { Feather } from '../../../lib/icons';
import { isBusy, isFailed } from '../../../lib/query-state';
import { colors } from '../../../lib/theme';

// connection.listConnections returns accepted connections as bare ids only,
// with no pending-request listing. Until a connection API change lands, this
// tab shows the real count and the way to find athletes, never sample people.

function ConnectionsShell({ subtitle, children }: { subtitle: string; children: ReactElement }): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title={t('tabs.connections')} subtitle={subtitle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-6 pt-4">
        {children}
      </ScrollView>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <ConnectionsShell subtitle={t('connections.sub.error')}>
      <StatePanel
        tone="danger"
        icon="alert-circle"
        title={t('connections.error.title')}
        body={t('common.checkConnection')}
        primary={{ label: t('common.tryAgain'), onPress: onRetry }}
      />
    </ConnectionsShell>
  );
}

export default function ConnectionsScreen(): ReactElement {
  const { t } = useMobileLocalization();
  const myAthlete = useMyAthlete();
  if (isBusy(myAthlete)) {
    return (
      <ConnectionsShell subtitle={t('connections.sub.empty')}>
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
  const { t } = useMobileLocalization();
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
      <ConnectionsShell subtitle={t('connections.sub.empty')}>
        <TabSkeleton variant="list" />
      </ConnectionsShell>
    );
  }
  if (state === 'error') {
    return <ErrorState onRetry={() => { void connections.refetch(); }} />;
  }
  if (state === 'empty') {
    return (
      <ConnectionsShell subtitle={t('connections.sub.empty')}>
        <View>
          <StatePanel
            icon="users"
            title={t('connections.empty.title')}
            body={t('connections.empty.body')}
            primary={{ label: t('connections.findAthletes'), onPress: findAthletes }}
          />
          <View className="pt-5">
            <SectionTitle>{t('connections.pendingRequests')}</SectionTitle>
            <Card>
              <EmptyRow icon="users">{t('connections.noPending')}</EmptyRow>
            </Card>
          </View>
        </View>
      </ConnectionsShell>
    );
  }

  return (
    <ConnectionsShell subtitle={t('connections.athleteCount', { count })}>
      <View>
        <SectionTitle meta={t('connections.total', { count })}>{t('connections.yourNetwork')}</SectionTitle>
        <Card className="flex-row items-center gap-3 p-3.5">
          <View className="h-11 w-11 items-center justify-center rounded-md bg-blue-tint">
            <Feather name="users" size={20} color={colors.blue} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-row-title text-text">{t('connections.inNetwork', { count })}</Text>
            <Text className="mt-0.5 text-meta text-muted">{t('connections.findMore')}</Text>
          </View>
        </Card>
        <View className="pt-4">
          <PillButton label={t('connections.findAthletes')} icon="search" onPress={findAthletes} fullWidth />
        </View>
      </View>
    </ConnectionsShell>
  );
}
