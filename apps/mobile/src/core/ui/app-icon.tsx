import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { colors } from "@picket/design-tokens";
import type { ComponentProps } from "react";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function AppIcon({ name, size = 24, color = colors.mauve }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons accessible={false} importantForAccessibility="no-hide-descendants" name={name} size={size} color={color} />;
}
