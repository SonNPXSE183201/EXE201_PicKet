import { StyleSheet, View } from "react-native";
import { figmaText } from "./figma-ui";
import { PaperArt } from "./paper-art";
import { PicketText as Text } from "./picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";

/** Informational plan choice; billing owns selection and checkout. */
export function PlanChoiceCard({ plan, description }: { plan: "Plus" | "Pro"; description: string }) {
  const { colors } = useMobileStyles(() => ({}));
  return <View style={{ flex: 1, minWidth: 0, paddingTop: 22 }}><View style={{ minHeight: 156, borderRadius: 22, borderBottomLeftRadius: 10, padding: 14, paddingTop: 84, gap: 2, backgroundColor: plan === "Plus" ? colors.pocketBlue : colors.pocketLilac }}>
    <PaperArt id={plan === "Plus" ? "saveJar" : "moneyBloomScene"} style={styles.art} />
    <Text style={[figmaText.bodyStrong, { color: colors.text }]}>{plan}</Text><Text style={[figmaText.bodySmall, { color: colors.text }]}>{description}</Text>
  </View></View>;
}
const styles = StyleSheet.create({ art: { width: 84, height: 84, position: "absolute", right: 12, top: -22, transform: [{ rotate: "6deg" }] } });
