import { trpc, useAddAchievement, useMyAthlete, useQueryClient } from '@packages/api-client';
import type { AthleteAchievement, VerificationStatus } from '@packages/validators';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

type Filter = 'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED';

function filterLabel(f: Filter): string {
  switch (f) {
    case 'ALL':
      return 'Todos';
    case 'VERIFIED':
      return 'Verificados';
    case 'PENDING':
      return 'Pendientes';
    case 'REJECTED':
      return 'Rechazados';
  }
}

function EmptyState({ filter, isLoading }: { filter: Filter; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View className="py-12 items-center gap-3">
        {[1, 2, 3].map(i => (
          <View key={i} className="h-24 bg-paper rounded-xl w-full animate-pulse" />
        ))}
      </View>
    );
  }
  const messages: Record<Filter, string> = {
    ALL: 'Aún no tienes logros registrados.\n¡Agrega tu primer logro!',
    VERIFIED: 'No tienes logros verificados aún.',
    PENDING: 'No tienes logros pendientes de verificación.',
    REJECTED: 'No tienes logros rechazados.',
  };
  return (
    <View className="py-16 items-center px-6">
      <Text className="text-muted text-body text-center leading-6">{messages[filter]}</Text>
    </View>
  );
}

type BadgeConfig = { label: string; bgClassName: string; textClassName: string };

const badgeConfig: Record<VerificationStatus, BadgeConfig> = {
  VERIFIED: {
    label: 'Verificado',
    bgClassName: 'bg-blue-tint',
    textClassName: 'text-blue',
  },
  PENDING: {
    label: 'Pendiente',
    bgClassName: 'bg-pending-tint',
    textClassName: 'text-pending',
  },
  UNVERIFIED: {
    label: 'Sin verificar',
    bgClassName: 'bg-pending-tint',
    textClassName: 'text-pending',
  },
  REJECTED: {
    label: 'Rechazado',
    bgClassName: 'bg-red-100',
    textClassName: 'text-red-600',
  },
};

function AchievementCard({ achievement }: { achievement: AthleteAchievement }) {
  const badge = badgeConfig[achievement.verificationStatus];
  const formattedDate = achievement.achievedOn.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View className="bg-paper rounded-xl p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-body font-semibold text-text flex-1" numberOfLines={2}>
          {achievement.title}
        </Text>
        <View className={`${badge.bgClassName} rounded-pill px-3 py-1`}>
          <Text className={`${badge.textClassName} text-caption font-medium`}>
            {badge.label}
          </Text>
        </View>
      </View>

      <Text className="text-muted text-small mt-2">{achievement.organization}</Text>

      <Text className="text-muted text-caption mt-1">{formattedDate}</Text>

      {achievement.verificationStatus === 'PENDING' && (
        <Text className="text-pending text-caption mt-3 italic">
          En espera de verificación por un administrador
        </Text>
      )}
    </View>
  );
}

export default function AchievementsScreen() {
  const queryClient = useQueryClient();

  const myAthleteQuery = useMyAthlete();
  const athleteId = myAthleteQuery.data?.athleteId ?? null;

  const achievementsQuery = trpc.achievement.listAchievements.useQuery(
    { athleteId: athleteId ?? '' },
    { enabled: !!athleteId },
  );

  const addAchievement = useAddAchievement();

  const achievements = achievementsQuery.data ?? [];

  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');

  const filteredAchievements = achievements.filter(a => {
    if (activeFilter === 'ALL') return true;
    return a.verificationStatus === activeFilter;
  });

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formOrganization, setFormOrganization] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setFormTitle('');
    setFormOrganization('');
    setFormDate('');
    setFormErrors({});
    setShowForm(false);
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {};

    if (!formTitle.trim()) {
      errs['title'] = 'El título del logro es requerido';
    } else if (formTitle.trim().length < 2) {
      errs['title'] = 'El título debe tener al menos 2 caracteres';
    }

    if (!formOrganization.trim()) {
      errs['organization'] = 'La organización es requerida';
    } else if (formOrganization.trim().length < 2) {
      errs['organization'] = 'La organización debe tener al menos 2 caracteres';
    }

    if (!formDate) {
      errs['date'] = 'La fecha es requerida';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formDate)) {
        errs['date'] = 'Formato inválido. Usa AAAA-MM-DD';
      } else {
        const parsed = new Date(formDate);
        if (isNaN(parsed.getTime())) {
          errs['date'] = 'Fecha inválida';
        } else if (parsed > new Date()) {
          errs['date'] = 'La fecha no puede ser futura';
        }
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function getSpanishError(message: string): string {
    if (message.includes('FORBIDDEN')) return 'No tienes permiso para agregar logros';
    if (message.includes('NOT_FOUND')) return 'Perfil de atleta no encontrado';
    if (message.includes('Too many requests')) return 'Demasiados intentos. Espera un momento';
    return 'No se pudo guardar el logro. Intenta de nuevo';
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await addAchievement.mutateAsync({
        title: formTitle.trim(),
        organization: formOrganization.trim(),
        achievedOn: formDate,
      });
      await queryClient.invalidateQueries({
        queryKey: [['achievement', 'listAchievements']],
      });
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setFormErrors({ submit: getSpanishError(msg) });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (myAthleteQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    );
  }

  if (myAthleteQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas p-6">
        <Text className="text-muted text-small text-center mb-4">
          No pudimos cargar tus logros. Intenta de nuevo.
        </Text>
        <Pressable
          onPress={() => {
            void myAthleteQuery.refetch();
          }}
          className="bg-blue rounded-xl px-6 py-3"
        >
          <Text className="text-paper font-medium">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-canvas"
    >
      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-3 gap-2"
      >
        {(['ALL', 'VERIFIED', 'PENDING', 'REJECTED'] as Filter[]).map(f => (
          <Pressable
            key={f}
            onPress={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-pill border ${
              activeFilter === f ? 'bg-blue border-blue' : 'bg-paper border-line'
            }`}
          >
            <Text
              className={`text-small font-medium ${
                activeFilter === f ? 'text-paper' : 'text-muted'
              }`}
            >
              {filterLabel(f)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Achievements list */}
      <FlatList<AthleteAchievement>
        data={filteredAchievements}
        keyExtractor={item => item.id}
        contentContainerClassName="px-4 pb-32"
        onRefresh={() => {
          void achievementsQuery.refetch();
        }}
        refreshing={achievementsQuery.isFetching}
        ListEmptyComponent={
          <EmptyState filter={activeFilter} isLoading={achievementsQuery.isLoading} />
        }
        renderItem={({ item }) => <AchievementCard achievement={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
      />

      {/* Add form (slides in above the fixed button) */}
      {showForm && (
        <View className="absolute bottom-20 left-0 right-0 bg-canvas border-t border-line px-4 pt-4 pb-2">
          <Text className="text-body font-semibold text-text mb-4">Nuevo logro</Text>

          {formErrors['submit'] !== undefined && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <Text className="text-red-600 text-small">{formErrors['submit']}</Text>
            </View>
          )}

          <View className="mb-3">
            <TextInput
              value={formTitle}
              onChangeText={v => {
                setFormTitle(v);
                setFormErrors({});
              }}
              placeholder="Título del logro *"
              placeholderTextColor="#6B7280"
              className={`border rounded-xl px-4 py-3 text-text bg-paper ${
                formErrors['title'] !== undefined ? 'border-red-400' : 'border-line'
              }`}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            {formErrors['title'] !== undefined && (
              <Text className="text-red-500 text-caption mt-1">{formErrors['title']}</Text>
            )}
          </View>

          <View className="mb-3">
            <TextInput
              value={formOrganization}
              onChangeText={v => {
                setFormOrganization(v);
                setFormErrors({});
              }}
              placeholder="Organización *"
              placeholderTextColor="#6B7280"
              className={`border rounded-xl px-4 py-3 text-text bg-paper ${
                formErrors['organization'] !== undefined ? 'border-red-400' : 'border-line'
              }`}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            {formErrors['organization'] !== undefined && (
              <Text className="text-red-500 text-caption mt-1">{formErrors['organization']}</Text>
            )}
          </View>

          <View className="mb-4">
            <TextInput
              value={formDate}
              onChangeText={v => {
                setFormDate(v);
                setFormErrors({});
              }}
              placeholder="Fecha (AAAA-MM-DD) *"
              placeholderTextColor="#6B7280"
              className={`border rounded-xl px-4 py-3 text-text bg-paper ${
                formErrors['date'] !== undefined ? 'border-red-400' : 'border-line'
              }`}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              maxLength={10}
            />
            {formErrors['date'] !== undefined && (
              <Text className="text-red-500 text-caption mt-1">{formErrors['date']}</Text>
            )}
          </View>

          <Pressable
            onPress={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
            className={`rounded-xl py-3 items-center mb-2 ${
              isSubmitting ? 'opacity-50 bg-blue' : 'bg-blue'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-paper font-semibold">Guardar logro</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Fixed bottom button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-canvas border-t border-line">
        <Pressable
          onPress={() => setShowForm(prev => !prev)}
          className="bg-blue rounded-xl py-4 items-center"
        >
          <Text className="text-paper font-semibold text-body">
            {showForm ? 'Cancelar' : '+ Agregar logro'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
