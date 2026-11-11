import { useSignIn } from '@packages/auth'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView'
import { PillButton } from '../../components/PillButton'
import { sendLoginMagicLink } from '../../lib/auth-actions'
import { authErrorMessage } from '../../lib/auth-errors'
import { useMobileLocalization } from '../../lib/i18n'
import { Feather } from '../../lib/icons'
import { colors } from '../../lib/theme'

export default function VerifyScreen() {
  const router = useRouter()
  const { locale, t } = useMobileLocalization()
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
      router.replace('/login')
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
      setError(authErrorMessage(verifyError, locale))
      setCode('')
      return
    }
    router.replace('/profile')
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
      setError(authErrorMessage(message, locale))
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
    <KeyboardAwareScrollView className="flex-1 bg-canvas" contentContainerClassName="px-6 pb-8">
      {/* Back button */}
      <View className="flex-row items-center pb-6 pt-14">
        <Pressable
          onPress={() => router.back()}
          className="min-h-[44px] flex-row items-center gap-1 pr-4"
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Feather name="chevron-left" size={20} color={colors.blue} />
          <Text className="text-body-lg text-blue">{t('common.back')}</Text>
        </Pressable>
      </View>

      <Text accessibilityRole="header" className="mb-2 text-title2 font-bold text-text">
        {t('auth.checkEmail')}
      </Text>
      <Text className="mb-1 text-body text-muted">{t('auth.sentLinkAndCode', { email })}</Text>
      <Text className="mb-8 text-footnote text-subtle">{t('auth.enterSixDigitCode')}</Text>

      {/* OTP input */}
      <TextInput
        className="mb-4 rounded-lg border border-line bg-paper px-4 py-4 text-center text-title2 font-bold tracking-widest text-text"
        maxLength={8}
        keyboardType="numeric"
        autoFocus
        placeholder="000000"
        placeholderTextColor={colors.subtle}
        accessibilityLabel={t('auth.verificationCode')}
        value={code}
        onChangeText={setCode}
        onSubmitEditing={handleVerify}
        editable={!isLoading}
        returnKeyType="done"
      />

      {error !== null ? (
        <View accessibilityLiveRegion="polite" className="mb-4 rounded-lg border border-danger-line bg-danger-tint p-3">
          <Text className="text-footnote text-danger">{error}</Text>
        </View>
      ) : null}

      <PillButton
        label={t('auth.verifyCode')}
        onPress={() => { void handleVerify(); }}
        disabled={verifyDisabled}
        loading={isLoading}
        fullWidth
      />

      {/* Resend section */}
      <View className="mb-4 mt-8 items-center">
        <Text className="mb-2 text-body text-muted">{t('auth.didntGetCode')}</Text>
        <Pressable
          onPress={handleResend}
          disabled={resendDisabled}
          accessibilityRole="button"
          accessibilityLabel={cooldown > 0 ? t('auth.resendCountdown', { count: cooldown }) : t('auth.resendCode')}
          className="min-h-[44px] justify-center"
        >
          <Text className={`text-body font-semibold ${resendDisabled ? 'text-subtle' : 'text-blue'}`}>
            {cooldown > 0 ? t('auth.resendShort', { count: cooldown }) : t('auth.resendCode')}
          </Text>
        </Pressable>
      </View>

      <Text className="text-center text-small text-subtle">{t('auth.openEmailLink')}</Text>
    </KeyboardAwareScrollView>
  )
}
