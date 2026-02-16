export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

export type TextBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextWithBounds = {
  text: string;
  bounds: TextBounds;
};

/**
 * Extracts text with bounding boxes from an image when the native module supports it.
 * Returns null if the API is not available (e.g. web or older expo-text-extractor).
 */
export async function extractTextWithBounds(
  uri: string
): Promise<TextWithBounds[] | null> {
  try {
    const { requireNativeModule } = await import("expo-modules-core");
    const ExpoTextExtractor = requireNativeModule("ExpoTextExtractor");
    if (typeof ExpoTextExtractor.extractTextFromImageWithBounds !== "function") {
      return null;
    }
    const processedUri = uri.replace("file://", "");
    const raw = await ExpoTextExtractor.extractTextFromImageWithBounds(processedUri);
    if (!Array.isArray(raw)) return null;
    return raw.map((item: { text?: string; bounds?: TextBounds }) => ({
      text: typeof item.text === "string" ? item.text : "",
      bounds: item.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
    }));
  } catch {
    return null;
  }
}
