import {
  trpc,
  useMyAthlete,
  useMyPublicProfile,
  useQueryClient,
  useUpdateProfile,
  useUpdatePublicProfile,
} from '@packages/api-client';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

function getSpanishError(message: string): string {
  if (message.includes('FORBIDDEN')) return 'No tienes permiso para editar este perfil';
  if (message.includes('NOT_FOUND')) return 'Perfil no encontrado';
  if (message.includes('Too many requests')) return 'Demasiados intentos. Espera un momento';
  return 'No se pudo guardar. Por favor intenta de nuevo';
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const myAthleteQuery = useMyAthlete();
  const athleteId = myAthleteQuery.data?.athleteId ?? null;

  const privateProfileQuery = trpc.athlete.getProfile.useQuery(
    { athleteId: athleteId ?? '' },
    { enabled: !!athleteId },
  );
  const publicProfileQuery = useMyPublicProfile();

  const updatePrivateProfile = useUpdateProfile();
  const updatePublicProfile = useUpdatePublicProfile();

  // ── Public profile state ─────────────────────────────────────────
  const [publicBio, setPublicBio] = useState('');
  const [city, setCity] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [isSearchable, setIsSearchable] = useState(true);

  // ── Private profile state ────────────────────────────────────────
  const [exactDob, setExactDob] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [govId, setGovId] = useState('');

  // ── Dirty tracking ───────────────────────────────────────────────
  const [isPublicDirty, setIsPublicDirty] = useState(false);
  const [isPrivateDirty, setIsPrivateDirty] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (publicProfileQuery.data) {
      setPublicBio(publicProfileQuery.data.publicBio ?? '');
      setCity(publicProfileQuery.data.city ?? '');
      setPrimaryPosition(publicProfileQuery.data.primaryPosition ?? '');
      setHeightCm(publicProfileQuery.data.heightCm !== null && publicProfileQuery.data.heightCm !== undefined ? String(publicProfileQuery.data.heightCm) : '');
      setWeightKg(publicProfileQuery.data.weightKg !== null && publicProfileQuery.data.weightKg !== undefined ? String(publicProfileQuery.data.weightKg) : '');
      setIsSearchable(publicProfileQuery.data.isSearchable);
    }
  }, [publicProfileQuery.data]);

  useEffect(() => {
    if (privateProfileQuery.data) {
      setExactDob(privateProfileQuery.data.exactDob ?? '');
      setContactEmail(privateProfileQuery.data.contactEmail ?? '');
      setContactPhone(privateProfileQuery.data.contactPhone ?? '');
      setGovId(privateProfileQuery.data.govId ?? '');
    }
  }, [privateProfileQuery.data]);

  // ── Setters that mark dirty ──────────────────────────────────────
  const setPublic = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setIsPublicDirty(true); };
  const setPrivate = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setIsPrivateDirty(true); };

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (heightCm !== '') {
      const h = parseInt(heightCm, 10);
      if (isNaN(h) || h < 100 || h > 250) {
        newErrors['heightCm'] = 'Estatura válida: 100–250 cm';
      }
    }

    if (weightKg !== '') {
      const w = parseFloat(weightKg);
      if (isNaN(w) || w < 30 || w > 300) {
        newErrors['weightKg'] = 'Peso válido: 30–300 kg';
      }
    }

    if (exactDob !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(exactDob)) {
      newErrors['exactDob'] = 'Ingresa una fecha válida (AAAA-MM-DD)';
    }

    if (contactEmail !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
      newErrors['contactEmail'] = 'Ingresa un correo electrónico válido';
    } else if (contactEmail.length > 254) {
      newErrors['contactEmail'] = 'El correo no puede superar 254 caracteres';
    }

    if (contactPhone !== '' && (contactPhone.length < 7 || contactPhone.length > 20)) {
      newErrors['contactPhone'] = 'Ingresa un teléfono válido (7–20 caracteres)';
    }

    if (govId !== '' && (govId.length < 5 || govId.length > 30)) {
      newErrors['govId'] = 'Ingresa un número de identificación válido (5–30 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    if (!athleteId) return;
    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (isPublicDirty) {
        const parsedHeight = heightCm !== '' ? parseInt(heightCm, 10) : undefined;
        const parsedWeight = weightKg !== '' ? parseFloat(weightKg) : undefined;
        promises.push(
          updatePublicProfile.mutateAsync({
            publicBio: publicBio !== '' ? publicBio : undefined,
            city: city !== '' ? city : undefined,
            primaryPosition: primaryPosition !== '' ? primaryPosition : undefined,
            heightCm: parsedHeight,
            weightKg: parsedWeight,
            isSearchable,
          }),
        );
      }

      if (isPrivateDirty) {
        promises.push(
          updatePrivateProfile.mutateAsync({
            exactDob: exactDob !== '' ? exactDob : undefined,
            contactEmail: contactEmail !== '' ? contactEmail : undefined,
            contactPhone: contactPhone !== '' ? contactPhone : undefined,
            govId: govId !== '' ? govId : undefined,
          }),
        );
      }

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: [['athlete', 'getMyPublicProfile']] });
      await queryClient.invalidateQueries({ queryKey: [['athlete', 'getProfile']] });
      await queryClient.invalidateQueries({ queryKey: [['athlete', 'getMyAthlete']] });
      setIsPublicDirty(false);
      setIsPrivateDirty(false);
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setErrors({ save: getSpanishError(message) });
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading =
    myAthleteQuery.isLoading || privateProfileQuery.isLoading || publicProfileQuery.isLoading;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    );
  }

  const isDirty = isPublicDirty || isPrivateDirty;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="p-4 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        {errors['save'] !== undefined && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-sm">{errors['save']}</Text>
          </View>
        )}

        {/* ── SECCIÓN PÚBLICA ─────────────────────────────────────── */}
        <Text className="text-body font-bold text-text mb-3">Perfil público</Text>

        {/* Biografía */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Biografía</Text>
          <TextInput
            value={publicBio}
            onChangeText={setPublic(setPublicBio)}
            className="border border-line rounded-xl px-4 py-3 text-text bg-paper text-base"
            placeholder="Cuéntanos sobre ti como deportista..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
            returnKeyType="default"
          />
        </View>

        {/* Ciudad */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Ciudad</Text>
          <TextInput
            value={city}
            onChangeText={setPublic(setCity)}
            className="border border-line rounded-xl px-4 py-3 text-text bg-paper text-base"
            placeholder="Ej: Bogotá"
            placeholderTextColor="#6B7280"
            returnKeyType="next"
          />
        </View>

        {/* Posición principal */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Posición principal</Text>
          <TextInput
            value={primaryPosition}
            onChangeText={setPublic(setPrimaryPosition)}
            className="border border-line rounded-xl px-4 py-3 text-text bg-paper text-base"
            placeholder="Ej: Delantero, Portero, Defensa..."
            placeholderTextColor="#6B7280"
            returnKeyType="next"
          />
        </View>

        {/* Altura y Peso — side by side */}
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1">
            <Text className="text-body font-medium text-text mb-1">Altura (cm)</Text>
            <TextInput
              value={heightCm}
              onChangeText={setPublic(setHeightCm)}
              className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
                errors['heightCm'] !== undefined ? 'border-red-400' : 'border-line'
              }`}
              placeholder="Ej: 175"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              returnKeyType="next"
            />
            {errors['heightCm'] !== undefined && (
              <Text className="text-red-500 text-xs mt-1">{errors['heightCm']}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-body font-medium text-text mb-1">Peso (kg)</Text>
            <TextInput
              value={weightKg}
              onChangeText={setPublic(setWeightKg)}
              className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
                errors['weightKg'] !== undefined ? 'border-red-400' : 'border-line'
              }`}
              placeholder="Ej: 70"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            {errors['weightKg'] !== undefined && (
              <Text className="text-red-500 text-xs mt-1">{errors['weightKg']}</Text>
            )}
          </View>
        </View>

        {/* Visible en búsquedas */}
        <View className="flex-row items-center justify-between bg-paper border border-line rounded-xl px-4 py-3 mb-8">
          <View className="flex-1 mr-3">
            <Text className="text-body font-medium text-text">Visible en búsquedas</Text>
            <Text className="text-caption text-muted mt-0.5">
              Otros deportistas pueden encontrarte
            </Text>
          </View>
          <Switch
            value={isSearchable}
            onValueChange={setPublic(setIsSearchable)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* ── SECCIÓN PRIVADA ─────────────────────────────────────── */}
        <Text className="text-body font-bold text-text mb-3">Datos privados</Text>
        <Text className="text-caption text-muted mb-4">
          Solo tú puedes ver esta información. Se guarda cifrada.
        </Text>

        {/* Fecha de nacimiento */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Fecha de nacimiento</Text>
          <TextInput
            value={exactDob}
            onChangeText={setPrivate(setExactDob)}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['exactDob'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#6B7280"
            keyboardType="numbers-and-punctuation"
            returnKeyType="next"
          />
          {errors['exactDob'] !== undefined && (
            <Text className="text-red-500 text-xs mt-1">{errors['exactDob']}</Text>
          )}
        </View>

        {/* Correo de contacto */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Correo de contacto</Text>
          <TextInput
            value={contactEmail}
            onChangeText={setPrivate(setContactEmail)}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['contactEmail'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="tu@correo.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          {errors['contactEmail'] !== undefined && (
            <Text className="text-red-500 text-xs mt-1">{errors['contactEmail']}</Text>
          )}
        </View>

        {/* Teléfono de contacto */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Teléfono de contacto</Text>
          <TextInput
            value={contactPhone}
            onChangeText={setPrivate(setContactPhone)}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['contactPhone'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="Ej: +57 300 123 4567"
            placeholderTextColor="#6B7280"
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          {errors['contactPhone'] !== undefined && (
            <Text className="text-red-500 text-xs mt-1">{errors['contactPhone']}</Text>
          )}
        </View>

        {/* Número de identificación */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">Número de identificación</Text>
          <TextInput
            value={govId}
            onChangeText={setPrivate(setGovId)}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['govId'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="Ej: 1234567890"
            placeholderTextColor="#6B7280"
            returnKeyType="done"
          />
          {errors['govId'] !== undefined && (
            <Text className="text-red-500 text-xs mt-1">{errors['govId']}</Text>
          )}
        </View>

        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={isSaving || !isDirty || !athleteId}
          className={`rounded-xl py-4 items-center mt-4 ${
            isSaving || !isDirty || !athleteId ? 'bg-blue/50' : 'bg-blue'
          }`}
        >
          {isSaving
            ? <ActivityIndicator color="#ffffff" />
            : <Text className="text-white font-semibold text-base">Guardar cambios</Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
