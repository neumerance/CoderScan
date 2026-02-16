import { useRef } from "react";
import {
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSavedScans, type SavedScan } from "../contexts/SavedScansContext";

type DataScreenProps = {
  onOpenScan: (scan: SavedScan) => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function DataScreen({ onOpenScan }: DataScreenProps) {
  const { scans, deleteScan } = useSavedScans();
  const insets = useSafeAreaInsets();
  const swipeableRefs = useRef<Record<string, SwipeableMethods | null>>({});

  const handleDelete = (item: SavedScan) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    delete swipeableRefs.current[item.id];
    deleteScan(item.id);
  };

  const renderRightActions = (
    item: SavedScan
  ) => (
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    _swipeableMethods: SwipeableMethods
  ) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDelete(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Data</Text>
        <Text style={styles.subtitle}>
          {scans.length} saved scan{scans.length !== 1 ? "s" : ""}
        </Text>
      </View>
      {scans.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No saved scans yet. Capture a photo, analyze it, then tap "Save
            session" to add it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref) => {
                swipeableRefs.current[item.id] = ref;
              }}
              renderRightActions={renderRightActions(item)}
              onSwipeableOpen={() => {
                Object.entries(swipeableRefs.current).forEach(([id, r]) => {
                  if (id !== item.id) r?.close();
                });
              }}
              overshootRight={true}
              overshootFriction={10}
              friction={1}
            >
              <TouchableOpacity
                style={styles.item}
                onPress={() => onOpenScan(item)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemCount}>
                    {item.savedTexts.length}/{item.detectedEntries.length}
                  </Text>
                  <Text style={styles.itemDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    paddingRight: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    backgroundColor: "#e2e8f0",
  },
  itemContent: {
    flex: 1,
    marginLeft: 14,
  },
  itemCount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  itemDate: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  deleteAction: {
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    minHeight: 72,
    marginBottom: 10,
    borderRadius: 12,
  },
  deleteActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
