import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { MultiBarcodeScanner } from "./src/components/MultiBarcodeScanner";

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const handleRequestCamera = async () => {
    const result = await requestCameraPermission();
    if (result?.granted) {
      setShowCamera(true);
    } else if (result?.canAskAgain === false) {
      Alert.alert(
        "Camera access",
        "Camera permission was denied. You can enable it in Settings.",
        [{ text: "OK" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]
      );
    }
  };

  const handleRequestMedia = async () => {
    const result = await requestMediaPermission();
    if (!result?.granted && result?.canAskAgain === false) {
      Alert.alert(
        "Photo library access",
        "Photo library permission was denied. You can enable it in Settings.",
        [{ text: "OK" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]
      );
    }
  };

  if (showBarcodeScanner) {
    return (
      <>
        <MultiBarcodeScanner onClose={() => setShowBarcodeScanner(false)} />
        <StatusBar style="light" />
      </>
    );
  }

  if (showCamera && cameraPermission?.granted) {
    return (
      <View className="flex-1 bg-black">
        <CameraView className="flex-1" facing="back">
          <View className="flex-1 bg-transparent justify-end items-center pb-10">
            <TouchableOpacity
              className="bg-white/80 rounded-full px-8 py-4"
              onPress={() => setShowCamera(false)}
            >
              <Text className="text-black font-semibold">Close camera</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100">
      <StatusBar style="dark" />
      <View className="flex-1 px-6 pt-16 pb-10">
        <Text className="text-2xl font-bold text-slate-900 mb-2">
          CodeScan Boilerplate
        </Text>
        <Text className="text-slate-600 mb-8">
          React Native + Tailwind (NativeWind) with camera and file manager permissions.
        </Text>

        <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-slate-800 mb-1">
            Multi barcode scanner
          </Text>
          <Text className="text-slate-600 text-sm mb-3">
            Scan multiple QR/barcodes in one session. Codes are listed and deduplicated.
          </Text>
          <TouchableOpacity
            className="bg-emerald-600 rounded-xl py-3 px-4 active:opacity-80 mb-3"
            onPress={cameraPermission?.granted ? () => setShowBarcodeScanner(true) : handleRequestCamera}
          >
            <Text className="text-white font-medium text-center">
              Open barcode scanner
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-slate-800 mb-1">
            Camera permission
          </Text>
          <Text className="text-slate-600 text-sm mb-3">
            Status: {cameraPermission == null ? "Loading…" : cameraPermission.granted ? "Granted" : "Not granted"}
          </Text>
          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-3 px-4 active:opacity-80"
            onPress={cameraPermission?.granted ? () => setShowCamera(true) : handleRequestCamera}
          >
            <Text className="text-white font-medium text-center">
              {cameraPermission?.granted ? "Open camera" : "Request camera access"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-slate-800 mb-1">
            Photo / file manager permission
          </Text>
          <Text className="text-slate-600 text-sm mb-3">
            Status: {mediaPermission == null ? "Loading…" : mediaPermission.granted ? "Granted" : "Not granted"}
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
    </ScrollView>
  );
}
