import { useSignIn } from '@packages/auth'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

import { sendLoginMagicLink } from '../../lib/auth-actions'
import { getSpanishError } from '../../lib/auth-errors'
import { colors } from '../../lib/theme'

export default function VerifyScreen() {
  const router = useRouter()
  const rawParams = useLocalSearchParams<{ email?: string }>()
  const email: string | undefined = Array.isArray(rawParams.email)
    ? (rawParams.email[0] ?? undefined)
    : rawParams.email

  const { verifyOtp } = useSignIn()

  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)
  // Incrementing this key restarts the cooldown useEffect
  const [cooldownKey, setCooldownKey] = useState(0)

  // Redirect immediately if email is missing
  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/login')
    }
  }, [email, router])

  // Cooldown countdown — restarts whenever cooldownKey changes
  useEffect(() => {
    setCooldown(60)
    const id = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldownKey])

  const handleVerify = async (): Promise<void> => {
    if (code.length < 6 || !email) return
    setError(null)
    setIsLoading(true)
    const { error: verifyError } = await verifyOtp(email, code)
    setIsLoading(false)
    if (verifyError !== null) {
      setError(getSpanishError(verifyError))
      setCode('')
      return
    }
    router.replace('/(tabs)/profile')
  }

  const handleResend = async (): Promise<void> => {
    if (!email || cooldown > 0 || isLoading) return
    setError(null)
    setIsLoading(true)
    try {
      await sendLoginMagicLink({
        email,
        emailRedirectTo: 'athletepassport://auth/callback',
      })
    } catch (error: unknown) {
      setIsLoading(false)
      const message = error instanceof Error ? error.message : ''
      setError(getSpanishError(message))
      return
    }
    setIsLoading(false)
    setCooldownKey(k => k + 1)
  }

  // While waiting for redirect if email is missing
  if (!email) {
    return <View className="flex-1 bg-canvas" />
  }

  const verifyDisabled = code.length < 6 || isLoading
  const resendDisabled = cooldown > 0 || isLoading

  return (
    <View className="flex-1 bg-canvas px-6">
      {/* Back button */}
      <View className="pt-14 pb-6 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="pr-4"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text className="text-body-lg text-blue">← Volver</Text>
        </Pressable>
      </View>

      {/* Heading */}
      <Text className="text-title2 font-bold text-text mb-2">
        Revisa tu correo
      </Text>
      <Text className="text-body text-muted mb-1">
        Ingresaste como {email}
      </Text>
      <Text className="text-footnote text-subtle mb-8">
        Ingresa el código de 6 dígitos que te enviamos
      </Text>

      {/* OTP input */}
      <TextInput
        className="bg-paper border border-line rounded-lg px-4 py-4 text-title2 font-bold text-text text-center mb-4 tracking-widest"
        maxLength={6}
        keyboardType="numeric"
        autoFocus
        placeholder="000000"
        placeholderTextColor={colors.subtle}
        value={code}
        onChangeText={setCode}
        onSubmitEditing={handleVerify}
        editable={!isLoading}
        returnKeyType="done"
      />

      {/* Inline error */}
      {error !== null ? (
        <Text className="text-body text-red-600 mb-4">{error}</Text>
      ) : null}

      {/* Verify button */}
      <Pressable
        className={`items-center justify-center rounded-lg py-4 mb-8 bg-blue ${verifyDisabled ? 'opacity-50' : ''}`}
        onPress={handleVerify}
        disabled={verifyDisabled}
        accessibilityRole="button"
        accessibilityLabel="Verificar código"
      >
        {isLoading ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text className="text-body-lg font-semibold text-on-ink">
            Verificar código
          </Text>
        )}
      </Pressable>

      {/* Resend section */}
      <View className="items-center mb-4">
        <Text className="text-body text-muted mb-2">
          ¿No recibiste el código?
        </Text>
        <Pressable
          onPress={handleResend}
          disabled={resendDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'
          }
        >
          <Text
            className={`text-body font-semibold ${resendDisabled ? 'text-subtle' : 'text-blue'}`}
          >
            {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
          </Text>
        </Pressable>
      </View>

      {/* Magic link note */}
      <Text className="text-small text-subtle text-center">
        También puedes abrir el enlace que te enviamos por correo
      </Text>
    </View>
  )
}
