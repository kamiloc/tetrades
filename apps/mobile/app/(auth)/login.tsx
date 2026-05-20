import { useSignIn } from '@packages/auth'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSpanishError(message: string): string {
  if (message.includes('Invalid login credentials'))
    return 'Correo no registrado en el sistema'
  if (message.includes('Email not confirmed'))
    return 'Correo no confirmado. Revisa tu bandeja'
  if (message.includes('Too many requests'))
    return 'Demasiados intentos. Espera un momento'
  if (message.includes('User not found'))
    return 'No encontramos una cuenta con ese correo'
  if (message.includes('Email rate limit exceeded'))
    return 'Límite de envíos alcanzado. Intenta más tarde'
  if (
    message.includes('Token has expired') ||
    message.includes('token is invalid')
  )
    return 'El código expiró. Solicita uno nuevo'
  return 'Ocurrió un error. Por favor intenta de nuevo'
}

const ERROR_PARAM_MAP: Readonly<Record<string, string>> = {
  link_expired: 'El enlace expiró. Solicita uno nuevo.',
  link_invalid: 'El enlace no es válido. Intenta de nuevo.',
}

export default function LoginScreen() {
  const router = useRouter()
  const rawParams = useLocalSearchParams<{ error?: string }>()
  const errorParam = Array.isArray(rawParams.error)
    ? (rawParams.error[0] ?? undefined)
    : rawParams.error

  const { signInWithMagicLink } = useSignIn()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!errorParam) return
    setError(
      ERROR_PARAM_MAP[errorParam] ??
        'Ocurrió un error. Por favor intenta de nuevo.',
    )
  }, [errorParam])

  const handleSubmit = async () => {
    const trimmed = email.trim()
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Ingresa un correo electrónico válido')
      return
    }
    setError(null)
    setIsLoading(true)
    const { error: signInError } = await signInWithMagicLink(
      trimmed,
      'athletepassport://auth/callback',
    )
    setIsLoading(false)
    if (signInError !== null) {
      setError(getSpanishError(signInError))
      return
    }
    router.push(
      `/(auth)/verify?email=${encodeURIComponent(trimmed)}` as `/${string}`,
    )
  }

  const isEmpty = email.trim() === ''
  const isDisabled = isEmpty || isLoading

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6 pb-8">
        {/* Logo + Heading */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-xl bg-blue items-center justify-center mb-6">
            <Text className="text-title1 font-bold text-on-ink">A</Text>
          </View>
          <Text className="text-title1 font-bold text-text">
            Inicia sesión
          </Text>
        </View>

        {/* Email input */}
        <Text className="text-footnote font-semibold text-text mb-1">
          Correo electrónico
        </Text>
        <TextInput
          className="bg-paper border border-line rounded-lg px-4 py-3 text-body text-text mb-4"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          placeholder="tu@correo.com"
          placeholderTextColor="#9AA3B2"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleSubmit}
          editable={!isLoading}
          returnKeyType="done"
        />

        {/* Inline error */}
        {error !== null ? (
          <Text className="text-body text-red-600 mb-4">{error}</Text>
        ) : null}

        {/* Submit button */}
        <Pressable
          className={`items-center justify-center rounded-lg py-4 mb-6 bg-blue ${isDisabled ? 'opacity-50' : ''}`}
          onPress={handleSubmit}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-body-lg font-semibold text-on-ink">
              Continuar
            </Text>
          )}
        </Pressable>

        {/* Footer */}
        <Text className="text-small text-muted text-center">
          Al continuar, aceptas nuestros términos de uso
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}
