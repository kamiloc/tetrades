import { View, ActivityIndicator } from "react-native";

export default function FullScreenSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator />
    </View>
  );
}