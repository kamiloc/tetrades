import {
  useConnections,
  useListAchievements,
  useMyAthlete,
  useMyClubMemberships,
  useMyPublicProfile,
} from '@packages/api-client';
import { useSignOut } from '@packages/auth';
import { selectViewState } from '@packages/shared-logic';
import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AchievementRow } from '../../../components/AchievementRow';
import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { EmptyRow } from '../../../components/EmptyRow';
import { PillButton } from '../../../components/PillButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SectionTitle } from '../../../components/SectionTitle';
import { TabSkeleton } from '../../../components/Skeleton';
import { StatePanel } from '../../../components/StatePanel';
import { Tag } from '../../../components/Tag';
import { formatNumber } from '../../../lib/format';
import { useMobileLocalization } from '../../../lib/i18n';
import { Feather } from '../../../lib/icons';
import { isBusy, isFailed } from '../../../lib/query-state';
import { colors } from '../../../lib/theme';

const ACHIEVEMENT_PREVIEW_COUNT = 3;

function Stat({ label, value, divider = false, accent = false }: { label: string; value: string; divider?: boolean; accent?: boolean }): ReactElement {
  return (
    <View className={`flex-1 ${divider ? 'border-l border-line pl-3.5' : ''}`}>
      <Text className={`text-stat-value ${accent ? 'text-blue' : 'text-text'}`}>{value}</Text>
      <Text className="mt-0.5 text-stat-label uppercase text-muted">{label}</Text>
    </View>
  );
}

function ProfileStateShell({ state, onRetry, onSignOut }: { state: 'loading' | 'error'; onRetry: () => void; onSignOut: () => void }): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title={t('tabs.profile')} subtitle={state === 'error' ? t('profile.sub.error') : t('profile.sub.empty')} />
      {state === 'loading' ? (
        <TabSkeleton variant="profile" />
      ) : (
        <View className="px-4 pt-4">
          <StatePanel
            tone="danger"
            icon="alert-circle"
            title={t('profile.error.title')}
            body={t('common.checkConnection')}
            primary={{ label: t('common.tryAgain'), onPress: onRetry }}
            secondary={{ label: t('common.signOut'), onPress: onSignOut }}
          />
        </View>
      )}
    </View>
  );
}

// Resolves the signed-in athlete first, so every data hook below receives a
// real athleteId (the api-client hooks take no `enabled` option).
export default function ProfileScreen(): ReactElement {
  const myAthlete = useMyAthlete();
  const { signOut } = useSignOut();
  const onSignOut = (): void => { void signOut(); };

  if (isBusy(myAthlete)) return <ProfileStateShell state="loading" onRetry={() => undefined} onSignOut={onSignOut} />;
  if (isFailed(myAthlete) || !myAthlete.data) {
    return <ProfileStateShell state="error" onRetry={() => { void myAthlete.refetch(); }} onSignOut={onSignOut} />;
  }
  return (
    <ProfileBody
      athleteId={myAthlete.data.athleteId}
      displayName={myAthlete.data.displayName}
      sport={myAthlete.data.sport}
      onSignOut={onSignOut}
    />
  );
}

function ProfileBody({ athleteId, displayName, sport, onSignOut }: {
  athleteId: string;
  displayName: string | null;
  sport: string | null;
  onSignOut: () => void;
}): ReactElement {
  const { locale, t } = useMobileLocalization();
  const publicProfile = useMyPublicProfile();
  const achievements = useListAchievements({ athleteId, take: ACHIEVEMENT_PREVIEW_COUNT });
  const connections = useConnections(athleteId);
  const memberships = useMyClubMemberships({ take: 50 });
  const [dismissedEmpty, setDismissedEmpty] = useState(false);

  const queries = [publicProfile, achievements, connections];
  const profile = publicProfile.data;
  const achievementItems = achievements.data?.items ?? [];
  const hasProfileDetails =
    !!profile && (!!profile.publicBio || !!profile.primaryPosition || profile.heightCm !== null || profile.weightKg !== null);

  const state = selectViewState({
    isLoading: queries.some(isBusy),
    isError: queries.some(isFailed),
    isEmpty: !hasProfileDetails && achievementItems.length === 0 && !dismissedEmpty,
  });

  const retry = (): void => {
    for (const q of queries) void q.refetch();
  };

  if (state === 'loading' || state === 'error') {
    return <ProfileStateShell state={state} onRetry={retry} onSignOut={onSignOut} />;
  }

  const subtitle = t('profile.sub.empty');
  const activeClubs = (memberships.data?.items ?? []).filter((m) => m.status === 'ACTIVE').slice(0, 2);
  const connectionCount = connections.data?.length ?? 0;

  // Completeness counts only what exists after ADR-013 (no documents).
  const completion = [
    !!profile?.avatarAssetId,
    !!profile?.publicBio,
    !!sport,
    achievementItems.length > 0,
  ];
  const pct = Math.round((completion.filter(Boolean).length / completion.length) * 100);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
        <ScreenHeader title={t('tabs.profile')} subtitle={subtitle} overlap />

        {/* Identity card overlaps the header by 20pt */}
        <View className="-mt-5 px-4">
          <Card className="px-[18px] pb-[18px] pt-5">
            <View className="flex-row items-center gap-3.5">
              <Avatar name={displayName} size={68} ring />
              <View className="min-w-0 flex-1">
                <Text className="text-card-title text-text" numberOfLines={1}>
                  {displayName ?? t('profile.yourProfile')}
                </Text>
                <Text className="mt-1 text-[13.5px] text-muted">
                  {[profile?.primaryPosition, sport].filter(Boolean).join(' · ') || t('profile.addSportPosition')}
                </Text>
                {activeClubs.length > 0 ? (
                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    {activeClubs.map((m, i) => (
                      <Tag key={m.id} tone={i === 0 ? 'default' : 'blue'}>
                        {m.club.name}
                      </Tag>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
            <View className="mt-[18px] flex-row border-t border-line pt-4">
              <Stat label={t('profile.height')} value={profile && profile.heightCm !== null ? t('units.cm', { value: profile.heightCm }) : '—'} />
              <Stat label={t('profile.weight')} value={profile && profile.weightKg !== null ? t('units.kg', { value: profile.weightKg }) : '—'} divider />
              <Stat label={t('tabs.connections')} value={formatNumber(locale, connectionCount)} divider accent />
            </View>
          </Card>
        </View>

        {state === 'empty' ? (
          <View className="px-4 pt-5">
            <StatePanel
              icon="shield"
              title={t('profile.empty.title')}
              body={t('profile.empty.body')}
              primary={{ label: t('profile.empty.title'), onPress: () => router.push('/profile-edit') }}
              secondary={{ label: t('common.notNow'), onPress: () => setDismissedEmpty(true) }}
            />
          </View>
        ) : (
          <View className="px-4 pt-5">
            <SectionTitle action={{ label: t('common.edit'), onPress: () => router.push('/profile-edit') }}>{t('profile.about')}</SectionTitle>
            <Card className="px-4 py-3.5">
              <Text className="text-body-copy text-text">{profile?.publicBio ?? t('profile.bioPlaceholder')}</Text>
              {profile?.city ? (
                <View className="mt-2.5 flex-row items-center gap-1">
                  <Feather name="map-pin" size={13} color={colors.subtle} />
                  <Text className="text-[12.5px] text-muted">{profile.city}</Text>
                </View>
              ) : null}
            </Card>
          </View>
        )}

        <View className="px-4 pt-5">
          <SectionTitle action={{ label: t('common.seeAll'), onPress: () => router.push('/achievements') }}>{t('achievements.title')}</SectionTitle>
          <Card>
            {achievementItems.length === 0 ? (
              <EmptyRow icon="shield">{t('profile.noAchievements')}</EmptyRow>
            ) : (
              achievementItems.map((item, index) => (
                <AchievementRow
                  key={item.id}
                  title={item.title}
                  meta={`${item.achievedOn.getFullYear()} · ${item.organization}`}
                  status={item.verificationStatus}
                  last={index === achievementItems.length - 1}
                  onPress={() => router.push('/achievements')}
                />
              ))
            )}
          </Card>
        </View>

        {/* Passport completeness */}
        <View className="px-4 pt-5">
          <Card className="flex-row items-center gap-3 border-blue-line px-4 py-3.5" style={{ backgroundColor: '#F7FAFF' }}>
            <View className="h-10 w-10 items-center justify-center rounded-segmented bg-blue-tint">
              <Feather name="shield" size={20} color={colors.blue} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[13.5px] font-semibold text-text">{t('profile.passportComplete', { percent: pct })}</Text>
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={t('profile.passportComplete', { percent: pct })}
                accessibilityValue={{ min: 0, max: 100, now: pct }}
                className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-[#E6ECF6]"
              >
                <View className="h-full rounded-pill bg-blue" style={{ width: `${pct}%` }} />
              </View>
            </View>
            <PillButton label={t('profile.finish')} variant="ghost" onPress={() => router.push('/profile-edit')} />
          </Card>
        </View>

        {/* Visibility entry */}
        <View className="px-4 pt-5">
          <Card>
            <Pressable
              onPress={() => router.push('/visibility')}
              accessibilityRole="button"
              accessibilityHint={t('profile.visibilityHint')}
              className="min-h-[52px] flex-row items-center gap-3 px-4 py-3"
            >
              <View className="h-[34px] w-[34px] items-center justify-center rounded-md bg-canvas">
                <Feather name="eye" size={17} color={colors.muted} />
              </View>
              <Text className="flex-1 text-row-title text-text">{t('visibility.title')}</Text>
              <Feather name="chevron-right" size={18} color={colors.subtle} />
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
