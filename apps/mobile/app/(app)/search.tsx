import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatePanel } from '../../components/StatePanel';
import { useMobileLocalization } from '../../lib/i18n';
import { Feather } from '../../lib/icons';
import { colors } from '../../lib/theme';

// Athlete search is not wired yet: athlete.searchAthletes returns profiles
// without names, so results couldn't identify anyone. The follow-up change
// `wire-athlete-search` adds name-bearing results and a Connect action. Until
// then this screen says so instead of offering a field that does nothing.
export default function SearchScreen(): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title={t('search.title')} subtitle={t('search.subtitle')} onBack={() => router.back()} />
      <View className="gap-4 px-4 pt-4">
        <Card className="flex-row items-center gap-2 px-3.5 py-3 opacity-60">
          <Feather name="search" size={18} color={colors.subtle} />
          <Text className="flex-1 text-[14.5px] text-subtle">{t('search.placeholder')}</Text>
        </Card>
        <StatePanel
          icon="search"
          title={t('search.comingSoonTitle')}
          body={t('search.comingSoonBody')}
          primary={{ label: t('search.back'), onPress: () => router.back() }}
        />
      </View>
    </View>
  );
}
