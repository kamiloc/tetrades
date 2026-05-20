import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { supabase } from '../../lib/supabase'

// Mirror of Supabase's EmailOtpType — values the auth server sends in magic link callbacks
type MagicLinkOtpType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email'

export default function CallbackScreen() {
  const router = useRouter()
  const rawParams = useLocalSearchParams<{
    token_hash?: string
    type?: string
  }>()

  const tokenHash: string | undefined = Array.isArray(rawParams.token_hash)
    ? (rawParams.token_hash[0] ?? undefined)
    : rawParams.token_hash

  const otpType: string | undefined = Array.isArray(rawParams.type)
    ? (rawParams.type[0] ?? undefined)
    : rawParams.type

  useEffect(() => {
    if (!tokenHash || !otpType) {
      router.replace(
        '/(auth)/login?error=link_invalid' as `/${string}`,
      )
      return
    }

    void supabase.auth
      .verifyOtp({
        token_hash: tokenHash,
        type: otpType as MagicLinkOtpType,
      })
      .then(({ error }) => {
        if (error) throw error
        router.replace('/(tabs)/profile')
      })
      .catch(() => {
        router.replace(
          '/(auth)/login?error=link_expired' as `/${string}`,
        )
      })
  }, [router, tokenHash, otpType])

  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator />
    </View>
  )
}
