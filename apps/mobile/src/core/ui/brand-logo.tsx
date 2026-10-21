import { Image } from "react-native";

export function BrandLogo({ size = 48 }: { size?: number }) {
  return <Image accessibilityLabel="Logo Picket" source={require("../../../assets/picket-logo.png")} resizeMode="contain" style={{ width: size, height: size, flexShrink: 0 }} />;
}
