import { trpc, useMyAthlete, useQueryClient, useUpdateProfile } from '@packages/api-client';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

  const profileQuery = trpc.athlete.getProfile.useQuery(
    { athleteId: athleteId ?? '' },
    { enabled: !!athleteId },
  );

  const updateProfile = useUpdateProfile();

  const [exactDob, setExactDob] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [govId, setGovId] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setExactDob(profileQuery.data.exactDob ?? '');
      setContactEmail(profileQuery.data.contactEmail ?? '');
      setContactPhone(profileQuery.data.contactPhone ?? '');
      setGovId(profileQuery.data.govId ?? '');
    }
  }, [profileQuery.data]);

  const handleExactDobChange = (v: string) => { setExactDob(v); setIsDirty(true); };
  const handleContactEmailChange = (v: string) => { setContactEmail(v); setIsDirty(true); };
  const handleContactPhoneChange = (v: string) => { setContactPhone(v); setIsDirty(true); };
  const handleGovIdChange = (v: string) => { setGovId(v); setIsDirty(true); };

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

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
      await updateProfile.mutateAsync({
        exactDob: exactDob !== '' ? exactDob : undefined,
        contactEmail: contactEmail !== '' ? contactEmail : undefined,
        contactPhone: contactPhone !== '' ? contactPhone : undefined,
        govId: govId !== '' ? govId : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: [['athlete', 'getProfile']] });
      await queryClient.invalidateQueries({ queryKey: [['athlete', 'getMyAthlete']] });
      setIsDirty(false);
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setErrors({ save: getSpanishError(message) });
    } finally {
      setIsSaving(false);
    }
  }

  // Unsaved-changes prompt deferred — `useNavigation()`'s `beforeRemove` listener
  // interacted badly with expo-router 55 transitions ("Couldn't find a navigation
  // context"). Reintroduce once we move to a custom back handler that doesn't
  // need the react-navigation `navigation` prop.

  if (myAthleteQuery.isLoading || profileQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    );
  }

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

        {/* Fecha de nacimiento */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">
            Fecha de nacimiento
          </Text>
          <TextInput
            value={exactDob}
            onChangeText={handleExactDobChange}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['exactDob'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#6B7280"
            // muted token — must match tailwind.config.js
            keyboardType="numbers-and-punctuation"
            returnKeyType="next"
          />
          {errors['exactDob'] !== undefined && (
            <Text className="text-red-500 text-xs mt-1">{errors['exactDob']}</Text>
          )}
        </View>

        {/* Correo de contacto */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">
            Correo de contacto
          </Text>
          <TextInput
            value={contactEmail}
            onChangeText={handleContactEmailChange}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['contactEmail'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="tu@correo.com"
            placeholderTextColor="#6B7280"
            // muted token — must match tailwind.config.js
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
          <Text className="text-body font-medium text-text mb-1">
            Teléfono de contacto
          </Text>
          <TextInput
            value={contactPhone}
            onChangeText={handleContactPhoneChange}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['contactPhone'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="Ej: +57 300 123 4567"
            placeholderTextColor="#6B7280"
            // muted token — must match tailwind.config.js
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          {errors['contactPhone'] !== undefined && (
            <Text className="text-red-500 text-xs mt-1">{errors['contactPhone']}</Text>
          )}
        </View>

        {/* Número de identificación */}
        <View className="mb-5">
          <Text className="text-body font-medium text-text mb-1">
            Número de identificación
          </Text>
          <TextInput
            value={govId}
            onChangeText={handleGovIdChange}
            className={`border rounded-xl px-4 py-3 text-text bg-paper text-base ${
              errors['govId'] !== undefined ? 'border-red-400' : 'border-line'
            }`}
            placeholder="Ej: 1234567890"
            placeholderTextColor="#6B7280"
            // muted token — must match tailwind.config.js
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
