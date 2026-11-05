import { SwipeableRow } from "@/core/ui/swipeable-row";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { Transaction } from "@picket/domain";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { FigmaButton, Overline, ReceiptEdge, Skeleton, TransactionRow, figmaShadow } from "@/core/ui/figma-ui";
import { categoryTile } from "@/features/home/home-recent";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useFigmaCopy, figmaCopy } from "./figma-copy";

type Category = { id: string; name: string; icon: string | null };
export type SpendingDay = { key: string; label: string; rows: Transaction[]; today: boolean };

/** YYYY-MM-DD of an instant in the profile time zone. */
export function dayKeyAt(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}
export function dayLabel(key: string, language: string, today: boolean, withToday = true) {
  const [, month, day] = key.split("-").map(Number);
  const weekday = figmaCopy(language, "weekdayLong").split(",")[new Date(`${key}T12:00:00Z`).getUTCDay()];
  const base = `${weekday} ${day}/${month}`;
  return today && withToday ? `${figmaCopy(language, "today")} · ${base}` : base;
}
export function groupByDay(rows: Transaction[], timeZone: string, language: string): SpendingDay[] {
  const todayKey = dayKeyAt(new Date().toISOString(), timeZone);
  const groups = new Map<string, Transaction[]>();
  for (const row of rows) { const key = dayKeyAt(row.occurredAt, timeZone); groups.set(key, [...(groups.get(key) ?? []), row]); }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, items]) => ({ key, rows: items, today: key === todayKey, label: dayLabel(key, language, key === todayKey) }));
}

export function signedAmount(kind: string, amount: number, currency: string | undefined, language: "vi" | "en") {
  if (!currency) return "—";
  const money = formatMoney(amount, language, currency);
  return kind === "expense" ? `−${money}` : kind === "transfer" ? money : `+${money}`;
}

/** One day = one receipt paper (Figma Ngày …). */
export function DayPaper({ label, total, currency, rows, categories, accountNames, accountCurrency, onOpen, onArchive, prefix }: {
  label: string; total: number; currency?: string; rows: Transaction[]; categories: Category[]; accountNames: Map<string, string>; accountCurrency: Map<string, string>; onOpen(id: string): void; onArchive?(item: Transaction): void; prefix?: string;
}) {
  const { colors } = useMobileStyles(() => ({}));
  const { language } = useAppTheme();
  const archiveLabel = useFigmaCopy()("archiveConfirm");
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  return <View style={figmaShadow("paper")}>
    <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}><Overline muted={!prefix}>{prefix ? `${prefix} · ${label}` : label}</Overline></View>
        {currency ? <Text style={[figmaType.captionStrong, { color: total > 0 ? colors.income : colors.text }]}>{total > 0 ? "+" : total < 0 ? "−" : ""}{formatMoney(Math.abs(total), language, currency)}</Text> : null}
      </View>
      {rows.map((item) => {
        const category = categoryById.get(item.categoryId ?? "");
        const tile = categoryTile(category?.icon ?? null, category?.name || item.title, item.kind === "income", colors);
        const color = item.kind === "expense" ? colors.expense : item.kind === "transfer" ? colors.primary : colors.income;
        const row = <TransactionRow key={item.id} tileColor={tile.color} tile={<AppIcon name={tile.name} size={18} color={colors.text} />} title={item.title}
          meta={`${category?.name ?? ""}${category ? " · " : ""}${accountNames.get(item.accountId) ?? ""}`} amount={signedAmount(item.kind, item.amount, accountCurrency.get(item.accountId), language)} amountColor={color} onPress={() => onOpen(item.id)} />;
        return onArchive ? <SwipeableRow key={item.id} actionLabel={archiveLabel} onAction={() => onArchive(item)}>{row}</SwipeableRow> : row;
      })}
    </View>
    <ReceiptEdge direction="bottom" />
  </View>;
}

export function dayTotal(rows: Transaction[], accountCurrency: Map<string, string>, currency: string) {
  return rows.reduce((sum, row) => accountCurrency.get(row.accountId) !== currency || row.kind === "transfer" ? sum : sum + (row.kind === "expense" ? -row.amount : row.amount), 0);
}

/** Month stepper: ‹ Tháng 11, 2026 › with 32 round buttons. */
export function MonthSwitcher({ label, onPrev, onNext, onLabel, prevLabel, nextLabel }: { label: string; onPrev(): void; onNext(): void; onLabel(): void; prevLabel: string; nextLabel: string }) {
  const { colors } = useMobileStyles(() => ({}));
  const btn = { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, alignItems: "center" as const, justifyContent: "center" as const };
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={prevLabel} onPress={onPrev} style={btn}><AppIcon name="chevron-left" size={16} color={colors.text} /></Pressable>
    <Pressable accessibilityRole="button" onPress={onLabel} style={{ minHeight: 32, justifyContent: "center" }}><Text style={[figmaType.bodyStrong, { color: colors.text }]}>{label}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={nextLabel} onPress={onNext} style={btn}><AppIcon name="chevron-right" size={16} color={colors.text} /></Pressable>
  </View>;
}

/** List / calendar segmented toggle (elevated pill with a white selected disc). */
export function ViewToggle({ calendar, onChange, listLabel, calendarLabel }: { calendar: boolean; onChange(calendar: boolean): void; listLabel: string; calendarLabel: string }) {
  const { colors } = useMobileStyles(() => ({}));
  const cell = (active: boolean) => ({ width: 34, height: 34, borderRadius: 17, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: active ? colors.paper : "transparent" });
  return <View style={{ flexDirection: "row", gap: 2, padding: 3, borderRadius: 20, backgroundColor: colors.elevated }}>
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !calendar }} accessibilityLabel={listLabel} onPress={() => onChange(false)} style={cell(!calendar)}><AppIcon name="format-list-bulleted" size={18} color={!calendar ? colors.primary : colors.text} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ selected: calendar }} accessibilityLabel={calendarLabel} onPress={() => onChange(true)} style={cell(calendar)}><AppIcon name="calendar-month-outline" size={18} color={calendar ? colors.primary : colors.text} /></Pressable>
  </View>;
}

/** Month grid card: Monday-first, overflow days muted, dots for spending/income days. */
export function SpendingCalendar({ month, todayKey, selected, expenseDays, incomeDays, onSelect }: { month: string; todayKey: string; selected: string | null; expenseDays: Set<string>; incomeDays: Set<string>; onSelect(key: string | null): void }) {
  const { colors } = useMobileStyles(() => ({}));
  const copy = useFigmaCopy();
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return null;
  const first = new Date(Date.UTC(year, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const total = Math.ceil((offset + new Date(Date.UTC(year, m, 0)).getUTCDate()) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => { const date = new Date(Date.UTC(year, m - 1, 1 - offset + i)); return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === m - 1 }; });
  const dot = (color: string) => <View key={color} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />;
  return <View style={[{ backgroundColor: colors.paper, borderRadius: 24, padding: 16, gap: 8 }, figmaShadow("paper")]}>
    <View style={{ flexDirection: "row" }}>{copy("weekdayShort").split(",").map((d) => <Text key={d} style={[figmaType.bodySmall, { flex: 1, textAlign: "center", color: colors.muted }]}>{d}</Text>)}</View>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{cells.map((cell) => {
      const isToday = cell.key === todayKey, isSelected = cell.key === selected;
      return <View key={cell.key} style={{ width: "14.2857%", alignItems: "center", paddingVertical: 3 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={`${cell.day}/${cell.key.slice(5, 7)}`} onPress={() => onSelect(isSelected ? null : cell.key)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: isToday ? colors.primary : isSelected ? colors.selectedSurface : "transparent" }}>
          <Text style={[figmaType.bodyStrong, { color: isToday ? colors.onPrimary : cell.inMonth ? colors.text : colors.muted, opacity: cell.inMonth ? 1 : 0.6 }]}>{cell.day}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 3, height: 4, marginTop: 1 }}>{[expenseDays.has(cell.key) ? dot(colors.expense) : null, incomeDays.has(cell.key) ? dot(colors.income) : null]}</View>
      </View>;
    })}</View>
    <View style={{ flexDirection: "row", gap: 16, paddingTop: 4, flexWrap: "wrap" }}>
      {[[colors.expense, copy("legendExpense")], [colors.income, copy("legendIncome")]].map(([c, l]) => <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} /><Text style={[figmaType.bodySmall, { color: colors.muted }]}>{l}</Text></View>)}
    </View>
  </View>;
}

export function SpendingEmpty({ title, body, art, tile, action }: { title: string; body: string; art?: boolean; tile?: ReactNode; action?: { label: string; onPress(): void } }) {
  const { colors } = useMobileStyles(() => ({}));
  return <View style={{ alignItems: "center", gap: 8, paddingTop: 40, paddingHorizontal: 8 }}>
    {art ? <PaperArt id="receipt" style={{ width: 160, height: 160 }} /> : <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.pocketBlue, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{tile}</View>}
    <Text style={[figmaType.titleSection, { color: colors.text, textAlign: "center" }]}>{title}</Text>
    <Text style={[figmaType.bodySmall, { color: colors.muted, textAlign: "center" }]}>{body}</Text>
    {action ? <View style={{ marginTop: 8 }}><FigmaButton variant="outline" size="medium" label={action.label} onPress={action.onPress} /></View> : null}
  </View>;
}

export function SpendingSkeleton() {
  const { colors } = useMobileStyles(() => ({}));
  return <View accessible={false} style={{ gap: 20 }}>{[0, 1].map((i) => <View key={i} style={figmaShadow("paper")}>
    <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Skeleton width={110} height={8} /><Skeleton width={60} height={8} /></View>
      {[[150, 96], [120, 80], [170, 70]].map(([a, b], j) => <View key={j} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Skeleton width={36} height={36} radius={12} /><View style={{ flex: 1, gap: 8 }}><Skeleton width={a} height={8} /><Skeleton width={b} height={6} /></View><Skeleton width={48} height={8} /></View>)}
    </View><ReceiptEdge direction="bottom" /></View>)}</View>;
}
