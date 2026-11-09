import type { ImageSourcePropType } from "react-native";

/** Metro needs literal require paths. Register new art here; screens use stable IDs. */
export const paperAssets = {
  receipt: require("../../../assets/paper/receipt-envelope-v1.webp") as ImageSourcePropType,
  bloom: require("../../../assets/paper/picket-money-bloom-v2.webp") as ImageSourcePropType,
  food: require("../../../assets/paper/pocket-food-v2.webp") as ImageSourcePropType,
  transport: require("../../../assets/paper/pocket-transport-v2.webp") as ImageSourcePropType,
  leisure: require("../../../assets/paper/pocket-leisure-v2.webp") as ImageSourcePropType,
  shopping: require("../../../assets/paper/category-shopping-v1.webp") as ImageSourcePropType,
  home: require("../../../assets/paper/category-home-v1.webp") as ImageSourcePropType,
  health: require("../../../assets/paper/category-health-v1.webp") as ImageSourcePropType,
  gift: require("../../../assets/paper/category-gift-v1.webp") as ImageSourcePropType,
  beauty: require("../../../assets/paper/category-beauty-v1.webp") as ImageSourcePropType,
  bills: require("../../../assets/paper/category-bills-v1.webp") as ImageSourcePropType,
  cafe: require("../../../assets/paper/category-cafe-v1.webp") as ImageSourcePropType,
  education: require("../../../assets/paper/category-education-v1.webp") as ImageSourcePropType,
  fitness: require("../../../assets/paper/category-fitness-v1.webp") as ImageSourcePropType,
  gaming: require("../../../assets/paper/category-gaming-v1.webp") as ImageSourcePropType,
  groceries: require("../../../assets/paper/category-groceries-v1.webp") as ImageSourcePropType,
  music: require("../../../assets/paper/category-music-v1.webp") as ImageSourcePropType,
  pet: require("../../../assets/paper/category-pet-v1.webp") as ImageSourcePropType,
  salary: require("../../../assets/paper/category-salary-v1.webp") as ImageSourcePropType,
  bonus: require("../../../assets/paper/category-bonus-v1.webp") as ImageSourcePropType,
  investment: require("../../../assets/paper/category-investment-v1.webp") as ImageSourcePropType,
  savings: require("../../../assets/paper/category-savings-v1.webp") as ImageSourcePropType,
  security: require("../../../assets/paper/category-security-v1.webp") as ImageSourcePropType,
  travel: require("../../../assets/paper/category-travel-v1.webp") as ImageSourcePropType,
  vehicle: require("../../../assets/paper/category-vehicle-v1.webp") as ImageSourcePropType,
  empty: require("../../../assets/paper/state-empty-wallet-v1.webp") as ImageSourcePropType,
  error: require("../../../assets/paper/state-error-plant-v1.webp") as ImageSourcePropType,
};
export type PaperAssetId = keyof typeof paperAssets;
export function resolvePaperAsset(id: string): PaperAssetId { return Object.hasOwn(paperAssets, id) ? id as PaperAssetId : "shopping"; }
export const paperArtOptions: { id: PaperAssetId; label: string }[] = ["shopping", "home", "health", "gift", ...Object.keys(paperAssets).filter(id => !["shopping", "home", "health", "gift", "receipt", "empty", "error"].includes(id))].map(id => ({ id: id as PaperAssetId, label: `paper${id[0].toUpperCase()}${id.slice(1)}` }));
export const pocketDecorations: readonly { id: PaperAssetId; tone: "pocketCoral" | "pocketMint" | "pocketBlue" | "pocketLilac" }[] = [
  { id: "food", tone: "pocketCoral" }, { id: "transport", tone: "pocketMint" },
  { id: "leisure", tone: "pocketBlue" }, { id: "shopping", tone: "pocketLilac" },
];

export const paperFonts = {
  PicketDisplay: require("../../../assets/fonts/nunito-400.ttf"),
  PicketSemibold: require("../../../assets/fonts/nunito-600.ttf"),
  PicketBold: require("../../../assets/fonts/nunito-700.ttf"),
  PicketExtraBold: require("../../../assets/fonts/nunito-800.ttf"),
  PicketLatin: require("../../../assets/fonts/fredoka.ttf"),
  PicketHandwriting: require("../../../assets/fonts/playwrite-vn.ttf"),
};
