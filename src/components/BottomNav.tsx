import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type NavTab = "scanner" | "data" | "settings";

type TabConfig = {
  id: NavTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

type BottomNavProps = {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
};

const TABS: TabConfig[] = [
  { id: "scanner", label: "Scanner", icon: "scan", iconOutline: "scan-outline" },
  { id: "data", label: "Data", icon: "folder", iconOutline: "folder-outline" },
  { id: "settings", label: "Settings", icon: "settings", iconOutline: "settings-outline" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.icon : tab.iconOutline}
              size={24}
              color={isActive ? "#fff" : "rgba(255,255,255,0.6)"}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: "#22c55e",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  tabLabelActive: {
    color: "#fff",
  },
});
