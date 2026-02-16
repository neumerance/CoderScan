import { Image, StyleSheet, View } from "react-native";

type AnalyzeScreenProps = {
  capturedUri: string | null;
};

export function AnalyzeScreen({ capturedUri }: AnalyzeScreenProps) {
  return (
    <View style={styles.previewWrapper}>
      {capturedUri ? (
        <Image source={{ uri: capturedUri }} style={styles.previewImage} />
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
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  previewFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827",
  },
});
