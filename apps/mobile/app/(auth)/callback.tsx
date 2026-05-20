import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { verifyMagicLinkCallback } from '../../lib/auth-actions'
import { authClient } from '../../lib/auth-client'

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

    void verifyMagicLinkCallback(authClient, {
      tokenHash,
      type: otpType,
    })
      .then(() => {
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
