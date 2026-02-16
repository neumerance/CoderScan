import { Alert, Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const handleRequestCamera = async () => {
    const result = await requestCameraPermission();
    if (!result?.granted && result?.canAskAgain === false) {
      Alert.alert(
        "Camera access",
        "Camera permission was denied. You can enable it in Settings.",
        [
          { text: "OK" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleRequestMedia = async () => {
    const result = await requestMediaPermission();
    if (!result?.granted && result?.canAskAgain === false) {
      Alert.alert(
        "Photo library access",
        "Photo library permission was denied. You can enable it in Settings.",
        [
          { text: "OK" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  return (
    <View
      className="flex-1 bg-slate-100 px-6"
      style={{ paddingTop: insets.top + 32 }}
    >
      <Text className="text-xl font-bold text-slate-900 mb-2">Settings</Text>
      <Text className="text-slate-600 mb-6">
        Manage permissions and app preferences.
      </Text>

      <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <Text className="text-lg font-semibold text-slate-800 mb-1">
          Camera
        </Text>
        <Text className="text-slate-600 text-sm mb-3">
          Status:{" "}
          {cameraPermission == null
            ? "Loading…"
            : cameraPermission.granted
              ? "Granted"
              : "Not granted"}
        </Text>
        <TouchableOpacity
          className="bg-indigo-600 rounded-xl py-3 px-4 active:opacity-80"
          onPress={handleRequestCamera}
        >
          <Text className="text-white font-medium text-center">
            {cameraPermission?.granted ? "Camera granted" : "Request camera access"}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <Text className="text-lg font-semibold text-slate-800 mb-1">
          Photo library
        </Text>
        <Text className="text-slate-600 text-sm mb-3">
          Status:{" "}
          {mediaPermission == null
            ? "Loading…"
            : mediaPermission.granted
              ? "Granted"
              : "Not granted"}
        </Text>
        <TouchableOpacity
          className="bg-indigo-600 rounded-xl py-3 px-4 active:opacity-80"
          onPress={handleRequestMedia}
        >
          <Text className="text-white font-medium text-center">
            Request photo library access
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-slate-500 text-xs mt-4">
        {Platform.OS === "ios"
          ? "Permissions are configured in app.json (NSCameraUsageDescription, NSPhotoLibraryUsageDescription)."
          : "Permissions are configured in app.json (CAMERA, READ_MEDIA_*)."}
      </Text>
    </View>
  );
}
