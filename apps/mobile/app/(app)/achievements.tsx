import {
  trpc,
  useAddAchievement,
  useMyAthlete,
  useMyCertificationRequests,
  useMyClubMemberships,
  useRequestCertification,
  useWithdrawCertification,
} from '@packages/api-client';
import { canRequestCertification } from '@packages/shared-logic';
import type { AthleteAchievementPublicOutput, MyCertificationRequestOutput } from '@packages/validators';
import { router } from 'expo-router';
import { useMemo, useState, type ComponentProps, type ReactElement } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AchievementRow } from '../../components/AchievementRow';
import { Card } from '../../components/Card';
import { DateField, fromIsoDate } from '../../components/DateField';
import { EmptyRow } from '../../components/EmptyRow';
import { useKeyboardOverlap } from '../../components/KeyboardAwareScrollView';
import { PillButton } from '../../components/PillButton';
import { TabSkeleton } from '../../components/Skeleton';
import { StatePanel } from '../../components/StatePanel';
import { StatusChip } from '../../components/StatusChip';
import { ToastViewport, useToast } from '../../components/Toast';
import { formatDate } from '../../lib/format';
import { useMobileLocalization } from '../../lib/i18n';
import { Feather } from '../../lib/icons';
import { mutationErrorMessage, type ErrorCopy } from '../../lib/mutation-errors';
import { isBusy, isFailed } from '../../lib/query-state';
import { colors } from '../../lib/theme';

type Filter = 'ALL' | 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'REJECTED';

const FILTERS: readonly Filter[] = ['ALL', 'VERIFIED', 'PENDING', 'UNVERIFIED', 'REJECTED'];

const ACHIEVEMENTS_PAGE_SIZE = 20;
// Requests and memberships are bounded per athlete; one page (server max) is enough here.
const LOOKUP_PAGE_SIZE = 50;

export default function AchievementsScreen(): ReactElement {
  const { t } = useMobileLocalization();
  const myAthlete = useMyAthlete();
  if (isBusy(myAthlete)) return <TabSkeleton variant="list" />;
  if (isFailed(myAthlete) || !myAthlete.data) {
    return (
      <View className="flex-1 bg-canvas px-4 pt-4">
        <StatePanel
          tone="danger"
          icon="alert-circle"
          title={t('achievements.loadFailed')}
          body={t('common.checkConnection')}
          primary={{ label: t('common.tryAgain'), onPress: () => { void myAthlete.refetch(); } }}
        />
      </View>
    );
  }
  return <AchievementsBody athleteId={myAthlete.data.athleteId} />;
}

function AchievementsBody({ athleteId }: { athleteId: string }): ReactElement {
  const { t } = useMobileLocalization();
  const utils = trpc.useUtils();
  const achievementsQuery = trpc.achievement.listAchievements.useInfiniteQuery(
    { athleteId, take: ACHIEVEMENTS_PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );
  const requests = useMyCertificationRequests({ take: LOOKUP_PAGE_SIZE });
  const memberships = useMyClubMemberships({ take: LOOKUP_PAGE_SIZE });

  const achievements = useMemo(
    () => achievementsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [achievementsQuery.data],
  );
  // Requests arrive newest first, so the first one seen is the latest.
  const latestRequest = useMemo(() => {
    const map = new Map<string, MyCertificationRequestOutput>();
    for (const r of requests.data?.items ?? []) if (!map.has(r.achievementId)) map.set(r.achievementId, r);
    return map;
  }, [requests.data]);
  const activeClubs = useMemo(
    () => (memberships.data?.items ?? []).filter((m) => m.status === 'ACTIVE').map((m) => m.club),
    [memberships.data],
  );

  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = achievements.filter((a) => activeFilter === 'ALL' || a.verificationStatus === activeFilter);
  const selected = achievements.find((a) => a.id === selectedId) ?? null;

  const refreshCertification = (): void => {
    void utils.achievement.listAchievements.invalidate();
    void utils.achievement.listMyCertificationRequests.invalidate();
  };

  const meta = (a: AthleteAchievementPublicOutput): string => {
    const base = `${a.achievedOn.getFullYear()} · ${a.organization}`;
    const club = latestRequest.get(a.id)?.club.name;
    return a.verificationStatus === 'PENDING' && club ? `${base} · ${club}` : base;
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 py-3" className="grow-0">
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setActiveFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === f }}
            className={`min-h-[36px] justify-center rounded-pill border px-4 ${activeFilter === f ? 'border-blue bg-blue' : 'border-line bg-paper'}`}
          >
            <Text className={`text-cta ${activeFilter === f ? 'text-paper' : 'text-muted'}`}>{t(`achievements.filter.${f}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isBusy(achievementsQuery) ? (
        <TabSkeleton variant="list" />
      ) : isFailed(achievementsQuery) ? (
        <View className="px-4">
          <StatePanel
            tone="danger"
            icon="alert-circle"
            title={t('achievements.loadFailed')}
            body={t('common.checkConnection')}
            primary={{ label: t('common.tryAgain'), onPress: () => { void achievementsQuery.refetch(); } }}
          />
        </View>
      ) : (
        <FlatList<AthleteAchievementPublicOutput>
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-32"
          onRefresh={() => {
            void achievementsQuery.refetch();
            void requests.refetch();
          }}
          refreshing={achievementsQuery.isRefetching && !achievementsQuery.isFetchingNextPage}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (achievementsQuery.hasNextPage && !achievementsQuery.isFetchingNextPage) {
              void achievementsQuery.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <Card>
              <EmptyRow icon="shield">{t(`achievements.empty.${activeFilter}`)}</EmptyRow>
            </Card>
          }
          renderItem={({ item, index }) => (
            <View className={`overflow-hidden border-x border-line bg-paper ${index === 0 ? 'rounded-t-xl border-t' : ''} ${index === filtered.length - 1 ? 'rounded-b-xl border-b' : ''}`}>
              <AchievementRow
                title={item.title}
                meta={meta(item)}
                status={item.verificationStatus}
                last={index === filtered.length - 1}
                onPress={() => setSelectedId(item.id)}
              />
            </View>
          )}
        />
      )}

      {showForm ? (
        <AddAchievementForm
          onClose={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false);
            void utils.achievement.listAchievements.invalidate();
          }}
        />
      ) : null}

      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-canvas p-4">
        <PillButton
          label={t('achievements.add')}
          icon="plus"
          onPress={() => setShowForm(true)}
          fullWidth
        />
      </View>

      {selected ? (
        <CertificationSheet
          achievement={selected}
          latestRequest={latestRequest.get(selected.id) ?? null}
          activeClubs={activeClubs}
          clubsLoading={memberships.isLoading}
          onClose={() => setSelectedId(null)}
          onChanged={refreshCertification}
        />
      ) : null}
    </View>
  );
}

// ── Certification (ADR-016) ─────────────────────────────────────────────────
// Ask one active club to certify one achievement; withdraw while Pending; see
// the rejection reason and ask again. Only the server changes the status.
function CertificationSheet({
  achievement,
  latestRequest,
  activeClubs,
  clubsLoading,
  onClose,
  onChanged,
}: {
  achievement: AthleteAchievementPublicOutput;
  latestRequest: MyCertificationRequestOutput | null;
  activeClubs: ReadonlyArray<{ id: string; name: string }>;
  clubsLoading: boolean;
  onClose: () => void;
  onChanged: () => void;
}): ReactElement {
  const { locale, t } = useMobileLocalization();
  const requestCertification = useRequestCertification();
  const withdraw = useWithdrawCertification();
  const toast = useToast();
  const requestErrors: ErrorCopy = {
    CONFLICT: t('achievements.request.conflict'),
    FORBIDDEN: t('achievements.request.forbidden'),
    BAD_REQUEST: t('achievements.request.badRequest'),
    NOT_FOUND: t('achievements.request.notFound'),
    fallback: t('achievements.request.fallback'),
  };
  const withdrawErrors: ErrorCopy = {
    BAD_REQUEST: t('achievements.withdrawError.badRequest'),
    NOT_FOUND: t('achievements.withdrawError.notFound'),
    fallback: t('achievements.withdrawError.fallback'),
  };
  const [clubId, setClubId] = useState<string | null>(activeClubs[0]?.id ?? null);
  const status = achievement.verificationStatus;
  const pendingRequest = status === 'PENDING' && latestRequest?.status === 'PENDING' ? latestRequest : null;
  const rejection = status === 'REJECTED' && latestRequest?.status === 'REJECTED' ? latestRequest : null;

  const submit = (): void => {
    if (!clubId) return;
    requestCertification.mutate(
      { achievementId: achievement.id, clubId },
      {
        onSuccess: () => {
          const club = activeClubs.find((c) => c.id === clubId)?.name;
          toast.success(club ? t('achievements.requestedFrom', { club }) : t('achievements.requested'));
          onChanged();
          onClose();
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error, requestErrors));
          onChanged();
        },
      },
    );
  };

  const confirmWithdraw = (requestId: string): void => {
    Alert.alert(t('achievements.withdrawTitle'), t('achievements.withdrawBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('achievements.withdraw'),
        style: 'destructive',
        onPress: () =>
          withdraw.mutate(
            { requestId },
            {
              onSuccess: () => {
                toast.success(t('achievements.withdrawn'));
                onChanged();
                onClose();
              },
              onError: (error) => {
                toast.error(mutationErrorMessage(error, withdrawErrors));
                onChanged();
              },
            },
          ),
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} accessibilityLabel={t('common.close')} accessibilityRole="button" />
      <SafeAreaView edges={['bottom']} style={{ borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 20 }}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-card-title text-text">{achievement.title}</Text>
            <Text className="mt-1 text-meta text-muted">
              {achievement.organization} · {formatDate(locale, achievement.achievedOn, 'long')}
            </Text>
          </View>
          <StatusChip status={status} />
        </View>

        <View className="mt-4 gap-3 pb-4">
          {status === 'VERIFIED' ? (
            <Text className="text-state-body text-muted">
              {achievement.certifyingClub
                ? t('achievements.verifiedBy', { club: achievement.certifyingClub.name })
                : t('achievements.verified')}
            </Text>
          ) : null}

          {status === 'PENDING' ? (
            <>
              <Text className="text-state-body text-muted">
                {pendingRequest
                  ? t('achievements.pendingAt', { club: pendingRequest.club.name })
                  : t('achievements.pending')}
              </Text>
              {pendingRequest ? (
                <PillButton
                  label={t('achievements.withdrawRequest')}
                  variant="danger"
                  loading={withdraw.isPending}
                  onPress={() => confirmWithdraw(pendingRequest.id)}
                />
              ) : null}
            </>
          ) : null}

          {rejection ? (
            <View className="rounded-lg border border-danger-line bg-danger-tint p-3">
              <Text className="text-row-title text-danger">{t('achievements.rejectedBy', { club: rejection.club.name })}</Text>
              {rejection.rejectionReason ? (
                <Text className="mt-1 text-state-body text-text">“{rejection.rejectionReason}”</Text>
              ) : null}
            </View>
          ) : null}

          {canRequestCertification(status) ? (
            clubsLoading ? (
              <Text className="text-meta text-muted">{t('achievements.loadingClubs')}</Text>
            ) : activeClubs.length === 0 ? (
              <View className="gap-2">
                <Text className="text-state-body text-muted">{t('achievements.needMembership')}</Text>
                <PillButton label={status === 'REJECTED' ? t('achievements.requestAgain') : t('achievements.requestCertification')} onPress={() => undefined} disabled />
                <PillButton
                  label={t('common.viewClubs')}
                  variant="text"
                  onPress={() => {
                    onClose();
                    router.push('/clubs');
                  }}
                />
              </View>
            ) : (
              <View className="gap-2">
                <Text className="text-eyebrow uppercase text-muted">{t('achievements.askClub')}</Text>
                <View accessibilityRole="radiogroup" className="overflow-hidden rounded-lg border border-line">
                  {activeClubs.map((club, index) => {
                    const checked = club.id === clubId;
                    return (
                      <Pressable
                        key={club.id}
                        onPress={() => setClubId(club.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked }}
                        className={`min-h-[44px] flex-row items-center gap-3 px-3 ${index === 0 ? '' : 'border-t border-line'}`}
                      >
                        <Feather name={checked ? 'check' : 'flag'} size={16} color={checked ? colors.blue : colors.subtle} />
                        <Text className={`text-row-title ${checked ? 'text-blue' : 'text-text'}`}>{club.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <PillButton
                  label={status === 'REJECTED' ? t('achievements.requestAgain') : t('achievements.requestCertification')}
                  loading={requestCertification.isPending}
                  disabled={!clubId}
                  onPress={submit}
                />
              </View>
            )
          ) : null}

          <PillButton label={t('common.close')} variant="text" onPress={onClose} />
        </View>
      </SafeAreaView>
      <ToastViewport />
    </Modal>
  );
}

// ── Add achievement ─────────────────────────────────────────────────────────
// New achievements start Unverified (ADR-016).
function AddAchievementForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }): ReactElement {
  const { t } = useMobileLocalization();
  const addErrors: ErrorCopy = {
    FORBIDDEN: t('achievements.addError.forbidden'),
    NOT_FOUND: t('achievements.addError.notFound'),
    fallback: t('achievements.addError.fallback'),
  };
  const addAchievement = useAddAchievement();
  const toast = useToast();
  const { overlap, containerRef } = useKeyboardOverlap();
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (title.trim().length < 2) errs['title'] = t('achievements.titleTooShort');
    if (organization.trim().length < 2) errs['organization'] = t('achievements.organizationTooShort');
    const parsed = fromIsoDate(date);
    if (!parsed) errs['date'] = t('achievements.dateRequired');
    else if (parsed > new Date()) errs['date'] = t('achievements.dateFuture');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (): void => {
    if (!validate()) return;
    addAchievement.mutate(
      { title: title.trim(), organization: organization.trim(), achievedOn: date },
      {
        onSuccess: () => {
          toast.success(t('achievements.added'));
          onDone();
        },
        onError: (error) => {
          const message = mutationErrorMessage(error, addErrors);
          setErrors({ submit: message });
          toast.error(message);
        },
      },
    );
  };

  const field = (
    key: 'title' | 'organization',
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    extra: Partial<ComponentProps<typeof TextInput>> = {},
  ): ReactElement => (
    <View className="mb-3">
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChange(v);
          setErrors({});
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={placeholder}
        className={`rounded-lg border bg-paper px-4 py-3 text-text ${errors[key] !== undefined ? 'border-danger' : 'border-line'}`}
        {...extra}
      />
      {errors[key] !== undefined ? <Text className="mt-1 text-caption text-danger">{errors[key]}</Text> : null}
    </View>
  );

  // Bottom sheet; padding by the keyboard overlap keeps every field above it.
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View ref={containerRef} className="flex-1 justify-end" style={{ paddingBottom: overlap }}>
        <Pressable className="flex-1 bg-black/30" onPress={onClose} accessibilityLabel={t('common.close')} accessibilityRole="button" />
        <SafeAreaView
          edges={overlap > 0 ? [] : ['bottom']}
          style={{ backgroundColor: colors.canvas, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text accessibilityRole="header" className="text-row-title text-text">{t('achievements.new')}</Text>
            <PillButton label={t('common.cancel')} variant="text" onPress={onClose} />
          </View>
          {errors['submit'] !== undefined ? (
            <View className="mb-3 rounded-lg border border-danger-line bg-danger-tint p-3">
              <Text className="text-meta text-danger">{errors['submit']}</Text>
            </View>
          ) : null}
          {field('title', title, setTitle, t('achievements.titlePlaceholder'), { autoCapitalize: 'sentences', returnKeyType: 'next', autoFocus: true })}
          {field('organization', organization, setOrganization, t('achievements.organization'), { autoCapitalize: 'sentences', returnKeyType: 'done' })}
          <View className="mb-4">
            <DateField
              label={t('achievements.dateLabel')}
              placeholder={t('achievements.datePlaceholder')}
              value={date}
              onChange={(v) => {
                setDate(v);
                setErrors({});
              }}
              maximumDate={new Date()}
              error={errors['date'] !== undefined}
            />
            {errors['date'] !== undefined ? <Text className="mt-1 text-caption text-danger">{errors['date']}</Text> : null}
          </View>
          <PillButton label={t('achievements.save')} loading={addAchievement.isPending} onPress={submit} fullWidth />
        </SafeAreaView>
      </View>
      <ToastViewport />
    </Modal>
  );
}
