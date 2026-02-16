import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { OcrEntry } from "../components/DetectedCollapsible";
import { normalizeText } from "../utils/ocr";

const STORAGE_KEY = "@coderscan_saved_scans";

export type SavedScan = {
  id: string;
  imageUri: string;
  detectedEntries: OcrEntry[];
  savedTexts: string[];
  createdAt: number;
};

function dedupeSavedTexts(texts: string[]): string[] {
  const seen = new Set<string>();
  return texts.filter((t) => {
    const n = normalizeText(t);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

type SavedScansContextValue = {
  scans: SavedScan[];
  saveScan: (
    sourceImageUri: string,
    detectedEntries: OcrEntry[],
    savedTexts: string[],
    existingScan?: SavedScan
  ) => Promise<string | null>;
  deleteScan: (id: string) => Promise<void>;
  loadScans: () => Promise<void>;
};

const SavedScansContext = createContext<SavedScansContextValue | null>(null);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function persistScans(scans: SavedScan[]): Promise<void> {
  const payload = scans.map((s) => ({
    ...s,
    detectedEntries: s.detectedEntries,
    savedTexts: s.savedTexts,
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function SavedScansProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<SavedScan[]>([]);

  const loadScans = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setScans([]);
        return;
      }
      const parsed = JSON.parse(raw) as SavedScan[];
      setScans(parsed);
    } catch {
      setScans([]);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const saveScan = useCallback(
    async (
      sourceImageUri: string,
      detectedEntries: OcrEntry[],
      savedTexts: string[],
      existingScan?: SavedScan
    ): Promise<string | null> => {
      try {
        const deduped = dedupeSavedTexts(savedTexts);
        const docDir = FileSystem.documentDirectory;
        if (!docDir) {
          console.warn("Document directory not available");
          return null;
        }

        let id: string;
        let destUri: string;
        let createdAt: number = Date.now();

        if (existingScan) {
          id = existingScan.id;
          destUri = existingScan.imageUri;
          createdAt = existingScan.createdAt;
          const source = sourceImageUri.startsWith("file://")
            ? sourceImageUri
            : `file://${sourceImageUri}`;
          if (source !== destUri) {
            await FileSystem.copyAsync({ from: source, to: destUri });
          }
        } else {
          id = generateId();
          const scansDir = `${docDir}scans`;
          const dirInfo = await FileSystem.getInfoAsync(scansDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(scansDir, {
              intermediates: true,
            });
          }
          destUri = `${scansDir}/${id}.jpg`;
          const source = sourceImageUri.startsWith("file://")
            ? sourceImageUri
            : `file://${sourceImageUri}`;
          await FileSystem.copyAsync({ from: source, to: destUri });
        }

        const scan: SavedScan = {
          id,
          imageUri: destUri,
          detectedEntries,
          savedTexts: deduped,
          createdAt,
        };

        setScans((prev) => {
          const filtered = existingScan
            ? prev.filter((s) => s.id !== existingScan.id)
            : prev;
          const next = [scan, ...filtered];
          persistScans(next).catch(console.warn);
          return next;
        });
        return id;
      } catch (err) {
        console.warn("Failed to save scan", err);
        return null;
      }
    },
    []
  );

  const deleteScan = useCallback(async (id: string) => {
    setScans((prev) => {
      const scan = prev.find((s) => s.id === id);
      if (scan?.imageUri) {
        FileSystem.deleteAsync(scan.imageUri, { idempotent: true }).catch(
          () => {}
        );
      }
      const next = prev.filter((s) => s.id !== id);
      persistScans(next).catch(console.warn);
      return next;
    });
  }, []);

  return (
    <SavedScansContext.Provider
      value={{ scans, saveScan, deleteScan, loadScans }}
    >
      {children}
    </SavedScansContext.Provider>
  );
}

export function useSavedScans() {
  const ctx = useContext(SavedScansContext);
  if (!ctx) {
    throw new Error("useSavedScans must be used within SavedScansProvider");
  }
  return ctx;
}
