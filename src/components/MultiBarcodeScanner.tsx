import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type {
  BarcodeScanningResult,
  BarcodeType,
  BarcodeBounds,
} from "expo-camera";

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

const COOLDOWN_MS = 2000;
const ALREADY_SCANNED_INDICATOR_MS = 1800;

export type ScannedBarcode = {
  data: string;
  type: string;
};

type AlreadyScannedIndicator = {
  data: string;
  bounds: BarcodeBounds;
};

type MultiBarcodeScannerProps = {
  onClose: () => void;
};

function isValidBounds(bounds: BarcodeBounds): boolean {
  const { origin, size } = bounds;
  return (
    size != null &&
    typeof size.width === "number" &&
    typeof size.height === "number" &&
    size.width > 0 &&
    size.height > 0 &&
    origin != null &&
    typeof origin.x === "number" &&
    typeof origin.y === "number"
  );
}

export function MultiBarcodeScanner({ onClose }: MultiBarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBarcodes, setScannedBarcodes] = useState<ScannedBarcode[]>([]);
  const [alreadyScannedIndicator, setAlreadyScannedIndicator] =
    useState<AlreadyScannedIndicator | null>(null);
  const lastScannedRef = useRef<Record<string, number>>({});
  const scannedBarcodesRef = useRef<ScannedBarcode[]>([]);
  const indicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  scannedBarcodesRef.current = scannedBarcodes;

  const clearIndicator = useCallback(() => {
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
    setAlreadyScannedIndicator(null);
  }, []);

  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
    };
  }, []);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const { data, type, bounds } = result;

      const isAlreadyScanned = scannedBarcodesRef.current.some(
        (b) => b.data === data
      );
      if (isAlreadyScanned) {
        clearIndicator();
        if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
        setAlreadyScannedIndicator({ data, bounds });
        indicatorTimeoutRef.current = setTimeout(() => {
          indicatorTimeoutRef.current = null;
          setAlreadyScannedIndicator(null);
        }, ALREADY_SCANNED_INDICATOR_MS);
        return;
      }

      const now = Date.now();
      const last = lastScannedRef.current[data] ?? 0;
      if (now - last < COOLDOWN_MS) return;
      lastScannedRef.current[data] = now;
      clearIndicator();

      setScannedBarcodes((prev) => {
        if (prev.some((b) => b.data === data)) return prev;
        return [...prev, { data, type }];
      });
    },
    [clearIndicator]
  );

  const clearList = useCallback(() => {
    setScannedBarcodes([]);
    lastScannedRef.current = {};
    clearIndicator();
  }, [clearIndicator]);

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-6">
        <Text className="text-white text-center">Checking camera permission…</Text>
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
        <TouchableOpacity
          className="mt-4 py-2"
          onPress={onClose}
        >
          <Text className="text-slate-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const showBoundsIndicator =
    alreadyScannedIndicator &&
    isValidBounds(alreadyScannedIndicator.bounds);

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

  return (
    <View style={containerStyle}>
      <View style={styles.cameraWrapper}>
        <CameraView
          style={cameraStyle}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: SUPPORTED_BARCODE_TYPES }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      </View>
      <View style={styles.overlay} pointerEvents="box-none">
        {alreadyScannedIndicator && (
          <>
            {showBoundsIndicator ? (
              <View
                style={[
                  styles.alreadyScannedBadge,
                  {
                    position: "absolute",
                    left: alreadyScannedIndicator.bounds.origin.x,
                    top: alreadyScannedIndicator.bounds.origin.y,
                    width: Math.max(
                      alreadyScannedIndicator.bounds.size.width,
                      80
                    ),
                    minHeight: Math.max(
                      alreadyScannedIndicator.bounds.size.height,
                      28
                    ),
                  },
                ]}
                pointerEvents="none"
              >
                <Text
                  className="text-white font-semibold text-xs"
                  numberOfLines={1}
                >
                  ✓ Already scanned
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.alreadyScannedBanner,
                  {
                    position: "absolute",
                    left: 24,
                    right: 24,
                    top: screenHeight * 0.4,
                  },
                ]}
                pointerEvents="none"
              >
                <Text className="text-white font-semibold">
                  ✓ Already scanned
                </Text>
              </View>
            )}
          </>
        )}

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
          <View className="bg-black/70 rounded-2xl mx-4 max-h-56">
            <Text className="text-white font-semibold px-4 pt-3 pb-2">
              Scanned ({scannedBarcodes.length})
            </Text>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {scannedBarcodes.length === 0 ? (
                <Text className="text-slate-400 px-4 pb-3 text-sm">
                  Point the camera at barcodes or QR codes. New codes are added automatically.
                </Text>
              ) : (
                scannedBarcodes.map((b, i) => (
                  <View
                    key={`${b.data}-${i}`}
                    className="border-b border-slate-600/50 px-4 py-2.5"
                  >
                    <Text className="text-slate-300 text-xs uppercase">
                      {b.type}
                    </Text>
                    <Text
                      className="text-white text-sm"
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {b.data}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
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
    paddingBottom: 24,
  },
  scroll: { maxHeight: 200 },
  scrollContent: { paddingBottom: 16 },
  alreadyScannedBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  alreadyScannedBanner: {
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignSelf: "center",
  },
});
