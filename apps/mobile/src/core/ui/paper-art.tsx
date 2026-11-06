import { Image, type ImageStyle, type StyleProp } from "react-native";
import { paperAssets, type PaperAssetId } from "../theme/paper-assets";

/** Decorative art never contains the readable label or amount. */
export function PaperArt({ id, style }: { id: PaperAssetId; style?: StyleProp<ImageStyle> }) {
  return <Image accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={paperAssets[id]} resizeMode="contain" style={[{ width: 80, height: 80 }, style, id === "receipt" && { transform: [{ scale: 1.5 }] }]} />;
}
