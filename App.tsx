import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MultiBarcodeScanner } from "./src/components/MultiBarcodeScanner";
import { BottomNav, type NavTab } from "./src/components/BottomNav";
import { SavedScansProvider, useSavedScans, type SavedScan } from "./src/contexts/SavedScansContext";
import { DataScreen } from "./src/screens/DataScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

function AppContent() {
  const { saveScan } = useSavedScans();
  const [activeTab, setActiveTab] = useState<NavTab>("scanner");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerSession, setScannerSession] = useState<SavedScan | null>(null);

  const openScanner = (session?: SavedScan) => {
    setScannerSession(session ?? null);
    setShowScanner(true);
  };

  const closeScanner = () => {
    setShowScanner(false);
    setScannerSession(null);
  };

  const isShowingScanner = showScanner || activeTab === "scanner";

  const handleCloseScanner = () => {
    if (showScanner) {
      closeScanner();
    } else if (activeTab === "scanner") {
      setActiveTab("data");
    }
  };

  if (isShowingScanner) {
    return (
      <>
        <MultiBarcodeScanner
          onClose={handleCloseScanner}
          initialSession={
            scannerSession
              ? {
                  imageUri: scannerSession.imageUri,
                  detectedEntries: scannerSession.detectedEntries,
                  savedTexts: scannerSession.savedTexts,
                }
              : undefined
          }
          initialSessionForUpdate={scannerSession ?? undefined}
          onSaveSession={async (snapshot, existingScan) => {
            await saveScan(
              snapshot.imageUri,
              snapshot.detectedEntries,
              snapshot.savedTexts,
              existingScan
            );
          }}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
      <View style={{ flex: 1 }}>
        {activeTab === "data" && (
          <DataScreen onOpenScan={(scan) => openScanner(scan)} />
        )}
        {activeTab === "settings" && <SettingsScreen />}
      </View>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SavedScansProvider>
          <AppContent />
        </SavedScansProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
