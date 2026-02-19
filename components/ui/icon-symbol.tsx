import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "gearshape.fill": "settings",
  "book.fill": "menu-book",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "arrow.left": "arrow-back",
  "play.fill": "play-arrow",
  "doc.fill": "description",
  "link": "link",
  "checkmark.circle.fill": "check-circle",
  "circle": "radio-button-unchecked",
  "magnifyingglass": "search",
  "arrow.clockwise": "refresh",
  "bell.fill": "notifications",
  "person.fill": "person",
  "xmark": "close",
  "questionmark.circle": "help-outline",
  "pencil": "edit",
  "folder.fill": "folder",
  "video.fill": "videocam",
  "globe": "language",
  "bookmark.fill": "bookmark",
  "chart.bar.fill": "bar-chart",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
