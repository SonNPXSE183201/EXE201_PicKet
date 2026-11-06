import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAppTheme } from "@/features/settings/appearance-provider";
import type { ComponentProps } from "react";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function AppIcon({ name, size = 24, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useAppTheme();
  return <MaterialCommunityIcons accessible={false} importantForAccessibility="no-hide-descendants" name={name} size={size} color={color ?? colors.link} />;
}
