import { useSession } from '@packages/auth';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function RootIndex() {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/profile' : '/login'} />;
}
