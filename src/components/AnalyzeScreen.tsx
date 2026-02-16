import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { TextBounds } from "../utils/ocr";

export type DetectedEntryForOverlay = {
  text: string;
  selected: boolean;
  bounds?: TextBounds;
};

export type AnalyzeScreenProps = {
  capturedUri: string | null;
  detectedEntries: DetectedEntryForOverlay[];
};

export function AnalyzeScreen({ capturedUri, detectedEntries = [] }: AnalyzeScreenProps) {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!capturedUri) {
      setImageSize(null);
      return;
    }
    Image.getSize(
      capturedUri,
      (width, height) => setImageSize({ width, height }),
      () => setImageSize(null)
    );
  }, [capturedUri]);

  const entriesWithBounds = detectedEntries.filter(
    (e): e is DetectedEntryForOverlay & { bounds: TextBounds } =>
      e.bounds != null &&
      e.bounds.width > 0 &&
      e.bounds.height > 0
  );

  return (
    <View style={styles.previewWrapper}>
      {capturedUri ? (
        <View style={styles.imageContainer}>
          <View
            style={
              imageSize
                ? [styles.imageAspect, { aspectRatio: imageSize.width / imageSize.height }]
                : styles.imageAspectFallback
            }
          >
            <Image
              source={{ uri: capturedUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            {imageSize && entriesWithBounds.length > 0 ? (
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                {entriesWithBounds.map((entry, i) => (
                  <View
                    key={`${entry.text}-${i}`}
                    style={[
                      styles.boundingBox,
                      {
                        left: `${entry.bounds.x * 100}%`,
                        top: `${entry.bounds.y * 100}%`,
                        width: `${entry.bounds.width * 100}%`,
                        height: `${entry.bounds.height * 100}%`,
                        borderColor: entry.selected ? "#22C55E" : "rgba(255,255,255,0.4)",
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.previewFallback} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageAspect: {
    width: "100%",
    maxHeight: "100%",
  },
  imageAspectFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827",
  },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
  },
});
