import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { normalizeText } from "../utils/ocr";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

export type OcrEntry = {
  text: string;
  selected: boolean;
};

type DetectedCollapsibleProps = {
  entries: OcrEntry[];
  savedTexts: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleSelection: (text: string) => void;
  onSave: () => void;
  onClear: () => void;
  onReanalyze: () => void;
  hasNewToSave: boolean;
  emptyMessage?: string;
};

export function DetectedCollapsible({
  entries,
  savedTexts,
  collapsed,
  onToggleCollapsed,
  onToggleSelection,
  onSave,
  onClear,
  onReanalyze,
  hasNewToSave,
  emptyMessage = "Snap and analyze a photo to extract text.",
}: DetectedCollapsibleProps) {
  const selectedCount = entries.filter((entry) => {
    const alreadySaved = savedTexts.some(
      (saved) => normalizeText(saved) === normalizeText(entry.text)
    );
    return !alreadySaved && entry.selected;
  }).length;

  return (
    <View style={[styles.bottomPanel, !collapsed && styles.bottomPanelExpanded]}>
      <TouchableOpacity 
        style={styles.panelToggleButton} 
        onPress={onToggleCollapsed}
        activeOpacity={0.7}
      >
        <View style={styles.panelHandle} />
        <Text style={styles.panelToggleText}>
          {collapsed 
            ? `Detected (${entries.length}) • Selected (${selectedCount})` 
            : "Hide detected"}
        </Text>
      </TouchableOpacity>
      
      {!collapsed ? (
        <View style={styles.detectedPanel}>
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
            <Text className="text-white font-semibold">Detected text</Text>
            <TouchableOpacity onPress={onClear}>
              <Text className="text-slate-300 text-xs">Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.detectedListScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {entries.length === 0 ? (
              <Text className="text-slate-400 px-4 pb-3 text-sm">{emptyMessage}</Text>
            ) : (
              entries.map((entry, i) => {
                const alreadySaved = savedTexts.some(
                  (saved) => normalizeText(saved) === normalizeText(entry.text)
                );
                return (
                  <View
                    key={`${normalizeText(entry.text)}-${i}`}
                    className="border-b border-slate-600/50 px-4 py-2 flex-row items-center"
                  >
                    <TouchableOpacity
                      onPress={() => onToggleSelection(entry.text)}
                      disabled={alreadySaved}
                      style={[
                        styles.checkboxIndicator,
                        alreadySaved || entry.selected
                          ? styles.checkboxIndicatorChecked
                          : null,
                      ]}
                    >
                      {alreadySaved || entry.selected ? (
                        <Text style={styles.checkboxIndicatorCheckText}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                    <View className="flex-1 ml-3">
                      <Text
                        className="text-white text-sm"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {entry.text}
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
          <View style={styles.countSummary}>
            <Text style={styles.countSummaryText}>
              Detected: {entries.length} • Selected: {selectedCount}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveDetectedButton,
              !hasNewToSave ? styles.saveButtonDisabled : null,
            ]}
            onPress={onSave}
            disabled={!hasNewToSave}
          >
            <Text className="text-white text-center font-medium">Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reanalyzeButton}
            onPress={onReanalyze}
          >
            <Text style={styles.reanalyzeButtonText}>Reanalyze</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 14,
  },
  bottomPanelExpanded: {
    height: EXPANDED_HEIGHT,
  },
  panelToggleButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  panelHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    marginBottom: 6,
  },
  panelToggleText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  detectedPanel: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  detectedListScroll: {
    flex: 1,
  },
  scrollContent: { 
    paddingBottom: 16,
  },
  countSummary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  countSummaryText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  saveDetectedButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 10,
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  reanalyzeButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
  },
  reanalyzeButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
