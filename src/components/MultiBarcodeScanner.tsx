import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult, BarcodeType } from "expo-camera";

const SUPPORTED_BARCODE_TYPES: BarcodeType[] = [
  "qr",
  "ean13",
  "ean8",
  "code128",
  "upc_a",
  "upc_e",
  "pdf417",
  "datamatrix",
  "code39",
  "code93",
];
const LIVE_SCAN_COOLDOWN_MS = 1200;

export type ScannedBarcode = {
  data: string;
  type: string;
};

type LiveDetectedBarcode = ScannedBarcode & {
  selected: boolean;
};

type MultiBarcodeScannerProps = {
  onClose: () => void;
};

export function MultiBarcodeScanner({ onClose }: MultiBarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBarcodes, setScannedBarcodes] = useState<ScannedBarcode[]>([]);
  const [liveDetectedBarcodes, setLiveDetectedBarcodes] = useState<LiveDetectedBarcode[]>(
    []
  );
  const [isDetectedPanelCollapsed, setIsDetectedPanelCollapsed] = useState(true);
  const scannedBarcodesRef = useRef<ScannedBarcode[]>([]);
  const lastLiveScanAtRef = useRef<Record<string, number>>({});
  scannedBarcodesRef.current = scannedBarcodes;

  const clearList = useCallback(() => {
    setScannedBarcodes([]);
  }, []);

  const handleLiveBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const { data, type } = result;
      const now = Date.now();
      const last = lastLiveScanAtRef.current[data] ?? 0;
      if (now - last < LIVE_SCAN_COOLDOWN_MS) return;
      lastLiveScanAtRef.current[data] = now;
      setLiveDetectedBarcodes((prev) => {
        if (prev.some((b) => b.data === data)) return prev;
        return [...prev, { data, type, selected: true }];
      });
    },
    []
  );

  const handleSaveDetected = useCallback(() => {
    const existing = new Set(scannedBarcodesRef.current.map((b) => b.data));
    const toAdd = liveDetectedBarcodes
      .filter((b) => b.selected && !existing.has(b.data))
      .map((b) => ({ data: b.data, type: b.type }));
    if (toAdd.length > 0) {
      setScannedBarcodes((prev) => [...prev, ...toAdd]);
    }
  }, [liveDetectedBarcodes]);

  const clearDetected = useCallback(() => {
    setLiveDetectedBarcodes([]);
    lastLiveScanAtRef.current = {};
  }, []);

  const toggleDetectedSelection = useCallback((data: string) => {
    const isAlreadySaved = scannedBarcodesRef.current.some((b) => b.data === data);
    if (isAlreadySaved) return;
    setLiveDetectedBarcodes((prev) =>
      prev.map((b) => (b.data === data ? { ...b, selected: !b.selected } : b))
    );
  }, []);

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-6">
        <Text className="text-white text-center">
          Checking camera permission…
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-6">
        <Text className="text-white text-center mb-4">
          Camera access is needed for barcode scanning.
        </Text>
        <TouchableOpacity
          className="bg-indigo-600 rounded-xl py-3 px-6"
          onPress={requestPermission}
        >
          <Text className="text-white font-medium">Grant camera access</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-4 py-2" onPress={onClose}>
          <Text className="text-slate-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const expandedPanelHeight = Math.round(screenHeight * 0.75);

  const cameraStyle =
    Platform.OS === "ios"
      ? {
          position: "absolute" as const,
          top: 0,
          left: 0,
          width: screenWidth,
          height: screenHeight,
        }
      : styles.camera;

  const containerStyle =
    Platform.OS === "ios"
      ? [styles.container, { width: screenWidth, height: screenHeight }]
      : styles.container;
  const hasNewDetectedToSave = liveDetectedBarcodes.some(
    (b) => b.selected && !scannedBarcodesRef.current.some((s) => s.data === b.data)
  );

  return (
    <View style={containerStyle}>
      <View style={styles.cameraWrapper}>
        <CameraView
          style={cameraStyle}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: SUPPORTED_BARCODE_TYPES }}
          onBarcodeScanned={handleLiveBarcodeScanned}
        />
      </View>
      <View style={styles.overlay} pointerEvents="box-none">
        <View className="flex-row justify-between items-center pt-12 px-4">
          <TouchableOpacity
            className="bg-white/20 rounded-xl py-2.5 px-4"
            onPress={onClose}
          >
            <Text className="text-white font-medium">Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white/20 rounded-xl py-2.5 px-4"
            onPress={clearList}
          >
            <Text className="text-white font-medium">Clear list</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.panelToggleRow}>
            <TouchableOpacity
              style={styles.panelToggleButton}
              onPress={() =>
                setIsDetectedPanelCollapsed((collapsed) => !collapsed)
              }
            >
              <View style={styles.panelHandle} />
              <Text style={styles.panelToggleText}>
                {isDetectedPanelCollapsed
                  ? `Detected (${liveDetectedBarcodes.length})`
                  : "Hide detected"}
              </Text>
            </TouchableOpacity>
          </View>
          {!isDetectedPanelCollapsed ? (
            <View
              style={[
                styles.detectedPanelExpanded,
                {
                  height: expandedPanelHeight,
                  maxHeight: expandedPanelHeight,
                },
              ]}
            >
              <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
                <Text className="text-white font-semibold">Detected barcodes</Text>
                <TouchableOpacity onPress={clearDetected}>
                  <Text className="text-slate-300 text-xs">Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.detectedListScroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {liveDetectedBarcodes.length === 0 ? (
                  <Text className="text-slate-400 px-4 pb-3 text-sm">
                    Aim the camera at labels. We will list each barcode once.
                  </Text>
                ) : (
                  liveDetectedBarcodes.map((b, i) => {
                    const alreadySaved = scannedBarcodesRef.current.some(
                      (saved) => saved.data === b.data
                    );
                    return (
                    <View
                      key={`${b.data}-${i}`}
                      className="border-b border-slate-600/50 px-4 py-2 flex-row items-center"
                    >
                      <TouchableOpacity
                        onPress={() => toggleDetectedSelection(b.data)}
                        disabled={alreadySaved}
                        style={[
                          styles.checkboxIndicator,
                          alreadySaved || b.selected
                            ? styles.checkboxIndicatorChecked
                            : null,
                        ]}
                      >
                        {alreadySaved || b.selected ? (
                          <Text style={styles.checkboxIndicatorCheckText}>✓</Text>
                        ) : null}
                      </TouchableOpacity>
                      <View className="flex-1 ml-3">
                        <Text className="text-slate-300 text-xs uppercase">
                          {b.type}
                        </Text>
                        <Text
                          className="text-white text-sm"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {b.data}
                        </Text>
                      </View>
                      {alreadySaved ? (
                        <View style={styles.savedBadge}>
                          <Text style={styles.savedBadgeText}>Saved</Text>
                        </View>
                      ) : null}
                    </View>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.saveDetectedButton,
                  !hasNewDetectedToSave ? styles.saveButtonDisabled : null,
                ]}
                onPress={handleSaveDetected}
                disabled={!hasNewDetectedToSave}
              >
                <Text className="text-white text-center font-medium">Save new</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraWrapper: {
    ...StyleSheet.absoluteFillObject,
    position: "relative",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
  },
  detectedPanelExpanded: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  detectedListScroll: {
    flex: 1,
  },
  saveDetectedButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 10,
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 10,
  },
  scrollContent: { paddingBottom: 16 },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  panelToggleRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  panelToggleButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  panelHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  panelToggleText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  checkboxIndicator: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxIndicatorChecked: {
    backgroundColor: "rgba(34, 197, 94, 0.95)",
    borderColor: "rgba(34, 197, 94, 0.95)",
  },
  checkboxIndicatorCheckText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 14,
  },
  savedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.65)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  savedBadgeText: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "600",
  },
});
