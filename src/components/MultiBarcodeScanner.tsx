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
import type { GestureResponderEvent } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult, BarcodeType } from "expo-camera";
import { extractTextFromImage, isSupported as isOcrSupported } from "expo-text-extractor";

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
const LIVE_SCAN_COOLDOWN_MS = 250;
const OCR_CAPTURE_COOLDOWN_MS = 1200;
const MIN_ZOOM = 0;
const MAX_ZOOM = 1;

function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

function normalizeValue(value?: string): string {
  if (!value) return "";
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function extractCandidateValues(entry: { data: string; ocrText?: string }): string[] {
  const values = [normalizeValue(entry.data), normalizeValue(entry.ocrText)].filter(Boolean);
  return [...new Set(values)];
}

function findBestOcrLine(lines: string[], barcodeData: string): string | undefined {
  const barcodeNormalized = normalizeValue(barcodeData);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const normalized = normalizeValue(trimmed);
    if (!normalized || normalized === barcodeNormalized) continue;
    if (normalized.length < 3) continue;
    return trimmed;
  }
  return undefined;
}

export type ScannedBarcode = {
  data: string;
  type: string;
  ocrText?: string;
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
  const [zoom, setZoom] = useState(0);
  const cameraRef = useRef<CameraView | null>(null);
  const scannedBarcodesRef = useRef<ScannedBarcode[]>([]);
  const liveDetectedBarcodesRef = useRef<LiveDetectedBarcode[]>([]);
  const lastLiveScanAtRef = useRef<Record<string, number>>({});
  const ocrInFlightRef = useRef(false);
  const lastOcrCaptureAtRef = useRef(0);
  const ocrAttemptedRef = useRef<Record<string, boolean>>({});
  const pinchRef = useRef<{ initialDistance: number; startZoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  scannedBarcodesRef.current = scannedBarcodes;
  liveDetectedBarcodesRef.current = liveDetectedBarcodes;

  const clearList = useCallback(() => {
    setScannedBarcodes([]);
    ocrAttemptedRef.current = {};
  }, []);

  const runOcrForBarcode = useCallback(async (barcodeData: string) => {
    if (!isOcrSupported) return;
    if (!cameraRef.current || ocrInFlightRef.current) return;
    const now = Date.now();
    if (now - lastOcrCaptureAtRef.current < OCR_CAPTURE_COOLDOWN_MS) return;
    ocrInFlightRef.current = true;
    lastOcrCaptureAtRef.current = now;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
      });
      if (!photo?.uri) return;
      const lines = await extractTextFromImage(photo.uri);
      const bestOcrLine = findBestOcrLine(lines, barcodeData);
      if (!bestOcrLine) return;

      const candidateValues = extractCandidateValues({
        data: barcodeData,
        ocrText: bestOcrLine,
      });
      const duplicateInSaved = scannedBarcodesRef.current.some((saved) => {
        if (saved.data === barcodeData) return false;
        return extractCandidateValues(saved).some((v) => candidateValues.includes(v));
      });
      if (duplicateInSaved) return;

      setLiveDetectedBarcodes((prev) => {
        const duplicateInLive = prev.some((live) => {
          if (live.data === barcodeData) return false;
          return extractCandidateValues(live).some((v) => candidateValues.includes(v));
        });
        if (duplicateInLive) return prev;

        return prev.map((live) =>
          live.data === barcodeData ? { ...live, ocrText: bestOcrLine } : live
        );
      });
    } catch (error) {
      console.warn("OCR extraction failed", error);
    } finally {
      ocrInFlightRef.current = false;
    }
  }, []);

  const handleLiveBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const { data, type } = result;
      const now = Date.now();
      const last = lastLiveScanAtRef.current[data] ?? 0;
      if (now - last < LIVE_SCAN_COOLDOWN_MS) return;

      const normalizedData = normalizeValue(data);
      const duplicateInSaved = scannedBarcodesRef.current.some((saved) =>
        extractCandidateValues(saved).includes(normalizedData)
      );
      if (duplicateInSaved) return;

      const duplicateInLive = liveDetectedBarcodesRef.current.some((live) =>
        extractCandidateValues(live).includes(normalizedData)
      );
      if (duplicateInLive) return;

      lastLiveScanAtRef.current[data] = now;
      setLiveDetectedBarcodes((prev) => {
        return [...prev, { data, type, selected: true }];
      });
      if (!ocrAttemptedRef.current[data]) {
        ocrAttemptedRef.current[data] = true;
        void runOcrForBarcode(data);
      }
    },
    [runOcrForBarcode]
  );

  const handleSaveDetected = useCallback(() => {
    const existingValues = new Set(
      scannedBarcodesRef.current.flatMap((barcode) => extractCandidateValues(barcode))
    );
    const toAdd: ScannedBarcode[] = [];
    for (const barcode of liveDetectedBarcodes) {
      if (!barcode.selected) continue;
      const candidateValues = extractCandidateValues(barcode);
      const hasDuplicate = candidateValues.some((value) => existingValues.has(value));
      if (hasDuplicate) continue;
      toAdd.push({ data: barcode.data, type: barcode.type, ocrText: barcode.ocrText });
      candidateValues.forEach((value) => existingValues.add(value));
    }
    if (toAdd.length > 0) {
      setScannedBarcodes((prev) => [...prev, ...toAdd]);
    }
  }, [liveDetectedBarcodes]);

  const clearDetected = useCallback(() => {
    setLiveDetectedBarcodes([]);
    lastLiveScanAtRef.current = {};
    ocrAttemptedRef.current = {};
  }, []);

  const toggleDetectedSelection = useCallback((data: string) => {
    const target = liveDetectedBarcodesRef.current.find((b) => b.data === data);
    if (!target) return;
    const targetValues = extractCandidateValues(target);
    const isAlreadySaved = scannedBarcodesRef.current.some((saved) =>
      extractCandidateValues(saved).some((value) => targetValues.includes(value))
    );
    if (isAlreadySaved) return;
    setLiveDetectedBarcodes((prev) =>
      prev.map((b) => (b.data === data ? { ...b, selected: !b.selected } : b))
    );
  }, []);

  const handleTouchStart = useCallback(
    (evt: GestureResponderEvent) => {
      const touches = evt.nativeEvent.touches;
      if (touches.length >= 2) {
        const d = distance(
          touches[0].pageX,
          touches[0].pageY,
          touches[1].pageX,
          touches[1].pageY
        );
        pinchRef.current = { initialDistance: d, startZoom: zoomRef.current };
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (evt: GestureResponderEvent) => {
      const touches = evt.nativeEvent.touches;
      const pinch = pinchRef.current;
      if (pinch && touches.length >= 2) {
        const d = distance(
          touches[0].pageX,
          touches[0].pageY,
          touches[1].pageX,
          touches[1].pageY
        );
        if (pinch.initialDistance > 0) {
          const zoomDelta = (d - pinch.initialDistance) / 280;
          const next = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, pinch.startZoom + zoomDelta)
          );
          setZoom(next);
        }
      }
    },
    []
  );

  const handleTouchEnd = useCallback(
    (evt: GestureResponderEvent) => {
      if (evt.nativeEvent.touches.length < 2) {
        pinchRef.current = null;
      }
    },
    []
  );

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
    (b) =>
      b.selected &&
      !scannedBarcodesRef.current.some((saved) =>
        extractCandidateValues(saved).some((value) =>
          extractCandidateValues(b).includes(value)
        )
      )
  );

  return (
    <View style={containerStyle}>
      <View
        style={styles.cameraWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CameraView
          ref={cameraRef}
          style={cameraStyle}
          facing="back"
          autofocus="on"
          animateShutter={false}
          zoom={zoom}
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
                    const currentValues = extractCandidateValues(b);
                    const alreadySaved = scannedBarcodesRef.current.some((saved) =>
                      extractCandidateValues(saved).some((value) =>
                        currentValues.includes(value)
                      )
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
                        {b.ocrText ? (
                          <Text
                            className="text-emerald-300 text-xs mt-0.5"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            OCR: {b.ocrText}
                          </Text>
                        ) : null}
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
