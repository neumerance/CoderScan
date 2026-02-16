import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GestureResponderEvent } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { extractTextFromImage, isSupported as isOcrSupported } from "expo-text-extractor";
import { extractTextWithBounds, normalizeText } from "../utils/ocr";
import { AnalyzeScreen } from "./AnalyzeScreen";
import { CameraScreen } from "./CameraScreen";
import { DetectedCollapsible, type OcrEntry } from "./DetectedCollapsible";

const MIN_ZOOM = 0;
const MAX_ZOOM = 1;

type Mode = "camera" | "analyze";

export type SavedScanSnapshot = {
  imageUri: string;
  detectedEntries: OcrEntry[];
  savedTexts: string[];
};

export type SavedScanForUpdate = {
  id: string;
  imageUri: string;
  detectedEntries: OcrEntry[];
  savedTexts: string[];
  createdAt: number;
};

type MultiBarcodeScannerProps = {
  onClose: () => void;
  onItemsSaved?: (items: string[]) => void;
  initialSession?: SavedScanSnapshot;
  initialSessionForUpdate?: SavedScanForUpdate;
  onSaveSession?: (
    snapshot: SavedScanSnapshot,
    existingScan?: SavedScanForUpdate
  ) => void;
};

function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function MultiBarcodeScanner({
  onClose,
  onItemsSaved,
  initialSession,
  initialSessionForUpdate,
  onSaveSession,
}: MultiBarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>(initialSession ? "analyze" : "camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(
    initialSession?.imageUri ?? null
  );
  const [zoom, setZoom] = useState(0);
  const [isDetectedPanelCollapsed, setIsDetectedPanelCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzedCurrentCapture, setHasAnalyzedCurrentCapture] = useState(
    !!initialSession
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [detectedTexts, setDetectedTexts] = useState<OcrEntry[]>(
    initialSession?.detectedEntries ?? []
  );
  const [savedTexts, setSavedTexts] = useState<string[]>(
    initialSession?.savedTexts ?? []
  );

  useEffect(() => {
    if (initialSession) {
      setMode("analyze");
      setCapturedUri(initialSession.imageUri);
      setDetectedTexts(initialSession.detectedEntries);
      setSavedTexts(initialSession.savedTexts);
      setHasAnalyzedCurrentCapture(true);
      setIsDetectedPanelCollapsed(false);
    }
  }, [initialSession]);

  const cameraRef = useRef<CameraView | null>(null);
  const pinchRef = useRef<{ initialDistance: number; startZoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const handleTouchStart = useCallback((evt: GestureResponderEvent) => {
    const touches = evt.nativeEvent.touches;
    if (touches.length < 2) return;
    const d = distance(
      touches[0].pageX,
      touches[0].pageY,
      touches[1].pageX,
      touches[1].pageY
    );
    pinchRef.current = { initialDistance: d, startZoom: zoomRef.current };
  }, []);

  const handleTouchMove = useCallback((evt: GestureResponderEvent) => {
    const touches = evt.nativeEvent.touches;
    const pinch = pinchRef.current;
    if (!pinch || touches.length < 2 || pinch.initialDistance <= 0) return;
    const d = distance(
      touches[0].pageX,
      touches[0].pageY,
      touches[1].pageX,
      touches[1].pageY
    );
    const zoomDelta = (d - pinch.initialDistance) / 280;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinch.startZoom + zoomDelta));
    setZoom(next);
  }, []);

  const handleTouchEnd = useCallback((evt: GestureResponderEvent) => {
    if (evt.nativeEvent.touches.length < 2) {
      pinchRef.current = null;
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      if (!photo?.uri) return;
      setCapturedUri(photo.uri);
      setMode("analyze");
      setHasAnalyzedCurrentCapture(false);
      setAnalysisError(null);
    } catch (error) {
      console.warn("Capture failed", error);
      setAnalysisError("Failed to capture image. Please retry.");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setMode("camera");
    setCapturedUri(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setHasAnalyzedCurrentCapture(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!capturedUri) return;
    if (!isOcrSupported) {
      setAnalysisError("OCR is not supported in this runtime. Use development build.");
      setHasAnalyzedCurrentCapture(true);
      setIsDetectedPanelCollapsed(false);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const withBounds = await extractTextWithBounds(capturedUri);
      const existingDetected = new Set(detectedTexts.map((entry) => normalizeText(entry.text)));
      const existingSaved = new Set(savedTexts.map((text) => normalizeText(text)));
      const additions: OcrEntry[] = [];

      const processLine = (text: string, bounds?: { x: number; y: number; width: number; height: number }) => {
        const trimmed = text.trim();
        const normalized = normalizeText(trimmed);
        if (!trimmed || normalized.length < 3) return;
        if (
          normalized === "no" ||
          normalized === "serialnumber" ||
          normalized.includes("serial") ||
          trimmed.toLowerCase().includes("number")
        ) return;
        if (existingDetected.has(normalized) || existingSaved.has(normalized)) return;
        if (additions.some((entry) => normalizeText(entry.text) === normalized)) return;
        additions.push({ text: trimmed, selected: true, bounds });
      };

      if (withBounds && withBounds.length > 0) {
        for (const item of withBounds) {
          processLine(item.text, item.bounds);
        }
      } else {
        const lines = await extractTextFromImage(capturedUri);
        for (const raw of lines) {
          processLine(raw);
        }
      }

      if (additions.length === 0) {
        setAnalysisError("No new text detected. Retry with a clearer image.");
      } else {
        setDetectedTexts((prev) => [...prev, ...additions]);
      }
      setIsDetectedPanelCollapsed(false);
    } catch (error) {
      console.warn("OCR extraction failed", error);
      setAnalysisError("OCR failed to analyze this photo. Please retry.");
    } finally {
      setIsAnalyzing(false);
      setHasAnalyzedCurrentCapture(true);
      setIsDetectedPanelCollapsed(false);
    }
  }, [capturedUri, detectedTexts, savedTexts]);

  const toggleDetectedSelection = useCallback((text: string) => {
    const normalized = normalizeText(text);
    const alreadySaved = savedTexts.some((saved) => normalizeText(saved) === normalized);
    if (alreadySaved) return;
    setDetectedTexts((prev) =>
      prev.map((entry) =>
        normalizeText(entry.text) === normalized
          ? { ...entry, selected: !entry.selected }
          : entry
      )
    );
  }, [savedTexts]);

  const handleSaveDetected = useCallback(() => {
    const existing = new Set(savedTexts.map((text) => normalizeText(text)));
    const toAdd: string[] = [];
    for (const entry of detectedTexts) {
      if (!entry.selected) continue;
      const normalized = normalizeText(entry.text);
      if (!normalized || existing.has(normalized)) continue;
      existing.add(normalized);
      toAdd.push(entry.text);
    }
    const newSavedTexts = toAdd.length > 0 ? [...savedTexts, ...toAdd] : savedTexts;
    if (toAdd.length > 0) {
      setSavedTexts(newSavedTexts);
      onItemsSaved?.(toAdd);
    }
    if (capturedUri && onSaveSession && (newSavedTexts.length > 0 || detectedTexts.length > 0)) {
      onSaveSession(
        {
          imageUri: capturedUri,
          detectedEntries: detectedTexts,
          savedTexts: newSavedTexts,
        },
        initialSessionForUpdate
      );
    }
  }, [capturedUri, detectedTexts, savedTexts, onItemsSaved, onSaveSession, initialSessionForUpdate]);

  const clearDetected = useCallback(() => {
    setDetectedTexts([]);
    setAnalysisError(null);
  }, []);

  const handleReanalyze = useCallback(() => {
    setDetectedTexts([]);
    setAnalysisError(null);
    setHasAnalyzedCurrentCapture(false);
    setIsDetectedPanelCollapsed(true);
  }, []);

  const handleEditDetectedText = useCallback((oldText: string, newText: string) => {
    const normalizedOld = normalizeText(oldText);
    setDetectedTexts((prev) =>
      prev.map((entry) =>
        normalizeText(entry.text) === normalizedOld ? { ...entry, text: newText } : entry
      )
    );
  }, []);

  const hasNewDetectedToSave = useMemo(
    () =>
      detectedTexts.some(
        (entry) =>
          entry.selected &&
          !savedTexts.some(
            (saved) => normalizeText(saved) === normalizeText(entry.text)
          )
      ),
    [detectedTexts, savedTexts]
  );

  const hasDataToSave =
    hasNewDetectedToSave || savedTexts.length > 0 || detectedTexts.length > 0;

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-6">
        <Text className="text-white text-center">Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-6">
        <Text className="text-white text-center mb-4">
          Camera access is needed for OCR scanning.
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
  const containerStyle =
    Platform.OS === "ios"
      ? [styles.container, { width: screenWidth, height: screenHeight }]
      : styles.container;

  return (
    <View style={containerStyle}>
      {mode === "camera" ? (
        <CameraScreen
          ref={cameraRef}
          zoom={zoom}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      ) : (
        <AnalyzeScreen
          capturedUri={capturedUri}
          detectedEntries={detectedTexts}
        />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View className="flex-row items-center pt-12 px-4">
          <TouchableOpacity
            className="bg-white/20 rounded-xl py-2.5 px-3"
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {mode === "camera" ? (
          <View style={styles.captureControls}>
            <TouchableOpacity style={styles.captureButtonOuter} onPress={handleCapture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {mode === "analyze" && !hasAnalyzedCurrentCapture ? (
        <View style={styles.analyzeButtonContainer}>
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              isAnalyzing ? styles.analyzeButtonDisabled : null,
            ]}
            onPress={handleAnalyze}
            disabled={isAnalyzing}
          >
            <Text className="text-white text-center font-medium">
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRetry} style={styles.retakeButton}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {mode === "analyze" && hasAnalyzedCurrentCapture ? (
        <DetectedCollapsible
          entries={detectedTexts}
          savedTexts={savedTexts}
          collapsed={isDetectedPanelCollapsed}
          onToggleCollapsed={() =>
            setIsDetectedPanelCollapsed((c) => !c)
          }
          onToggleSelection={toggleDetectedSelection}
          onSave={handleSaveDetected}
          onClear={clearDetected}
          onReanalyze={handleReanalyze}
          onEditText={handleEditDetectedText}
          hasNewToSave={hasNewDetectedToSave}
          hasDataToSave={hasDataToSave}
          emptyMessage="Snap and analyze a photo to extract text."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
  collapsibleAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 30,
  },
  analyzeButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: "center",
    zIndex: 25,
    elevation: 25,
  },
  analyzeButton: {
    minWidth: 180,
    backgroundColor: "#DC2626",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  retakeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retakeButtonText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "600",
  },
  captureControls: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButtonOuter: {
    width: 78,
    height: 78,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
});
