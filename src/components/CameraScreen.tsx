import { forwardRef } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { CameraView } from "expo-camera";

type CameraScreenProps = {
  zoom: number;
  onTouchStart: (evt: GestureResponderEvent) => void;
  onTouchMove: (evt: GestureResponderEvent) => void;
  onTouchEnd: (evt: GestureResponderEvent) => void;
};

export const CameraScreen = forwardRef<CameraView, CameraScreenProps>(
  function CameraScreen({ zoom, onTouchStart, onTouchMove, onTouchEnd }, ref) {
    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
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

    return (
      <View
        style={styles.cameraWrapper}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CameraView
          ref={ref}
          style={cameraStyle}
          facing="back"
          autofocus="on"
          animateShutter={false}
          zoom={zoom}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cameraWrapper: {
    ...StyleSheet.absoluteFillObject,
    position: "relative",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
});
