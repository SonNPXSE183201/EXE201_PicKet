import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { usePocketAppearance } from "@/features/budgets/use-pocket-appearance";
import { defaultPocketAppearance, type PocketAppearance } from "@/features/budgets/pocket-appearance";
import { PocketAppearancePicker } from "@/features/budgets/pocket-appearance-picker";
import { PicketText as Text } from "@/core/ui/picket-text";

import { resolvePaperAsset } from "@/core/theme/paper-assets";
import { PaperArt } from "@/core/ui/paper-art";
import { useTranslation } from "react-i18next";
import { formatMoney, normalizeLanguage } from "@/core/i18n/formatters";
import { parsePaymentAmount } from "@/core/forms/payment-form";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, StyleSheet, View, useWindowDimensions } from "react-native";
import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { budgetOverview } from "@/core/local/budget-overview";
import { loadBudgetSplits } from "@/core/local/load-budget-splits";
import { guestBudgetSpent } from "@/core/local/guest-finance";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ActionSheet, ConnectionNotice, DangerAction, EmptyState, IconButton, MenuRow, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function BudgetsScreen() {
  const { t: designCopy } = useTranslation("overview");
  const { appearances, save: saveAppearance } = usePocketAppearance();
  const params = useLocalSearchParams<{ create?: string }>();
  const [appearance, setAppearance] = useState<PocketAppearance>({ assetId: "shopping", tone: "pocketLilac" });
  const [appearanceId, setAppearanceId] = useState<string | null>(null);
  const [appearanceError, setAppearanceError] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const { t, i18n } = useTranslation("budgets");
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const money = (amount: number) => formatMoney(amount, language, "VND");
  const { colors } = useMobileStyles(createStyles);
  const { styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const { categories, transactions } = useTransactions();
  const { budgets, loading, error, create, update, archive, refresh } = useBudgets();
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("1000000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedLimit, setEditedLimit] = useState("");
  const [periodLimits, setPeriodLimits] = useState<{ month: string; limits: Record<string, number> } | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [cloudSplits, setCloudSplits] = useState<{ month: string; splits: Awaited<ReturnType<typeof loadBudgetSplits>> } | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(params.create === "1");
  const [managingId, setManagingId] = useState<string | null>(null);
  const { fontScale } = useWindowDimensions();
  const monthText = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  useFocusEffect(
    useCallback(() => {
      if (localMode || !session || !picketApi) return;
      let active = true;
      void picketApi
        .getPlanning(session.access_token, monthText)
        .then((planning) => {
          if (active) {
            setPeriodLimits({
              month: monthText,
              limits: Object.fromEntries(planning.periods.map((period) => [period.budgetId, period.limit])),
            });
            setPeriodError(null);
          }
        })
        .catch(() => {
          if (active) {
            setPeriodLimits(null);
            setPeriodError("periodFailed");
          }
        });
      return () => {
        active = false;
      };
    }, [localMode, monthText, session]),
  );

  useFocusEffect(
    useCallback(() => {
      if (localMode || !session || !picketApi) return;
      const api = picketApi;
      let active = true;
      setCloudSplits(null);
      setSplitError(null);
      void loadBudgetSplits(transactions, monthText, async (ids) => (await api.listTransactionSplitsByIds(session.access_token, ids)).splits)
        .then((splits) => {
          if (active) setCloudSplits({ month: monthText, splits });
        })
        .catch(() => {
          if (active) setSplitError("splitsFailed");
        });
      return () => {
        active = false;
      };
    }, [localMode, monthText, session, transactions]),
  );

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const expenseCategories = categories.filter((item) => item.kind === "expense" || item.kind === "both");
  const managing = budgets.find((item) => item.id === managingId);
  const editing = budgets.find((item) => item.id === editingId);
  const selected = expenseCategories.find((item) => item.id === categoryId) ?? expenseCategories[0];

  async function add() {
    const amount = parsePaymentAmount(limit);
    if (!selected || amount === null) {
      setMessage("invalidCreate");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const created = await create({
        categoryId: selected.id,
        name: budgetName.trim() || selected.name,
        defaultLimit: amount,
        alertPercent: 80,
      });
      try {
        await saveAppearance(created.id, appearance);
        setAppearanceError(false);
      } catch {
        setAppearanceError(true);
      }
      setBudgetName("");
      setLimit("1000000");
      setShowCreate(false);
    } catch (caught) {
      if (isOfflineQueuedError(caught)) {
        setShowCreate(false);
        setMessage("queued");
      } else setMessage("createFailed");
    } finally {
      setBusy(false);
    }
  }

  async function archiveBudget(id: string, version: number) {
    setBusy(true);
    setMessage(null);
    try {
      await archive(id, version);
    } catch (caught) {
      if (!isOfflineQueuedError(caught)) setMessage("archiveFailed");
    } finally {
      setBusy(false);
    }
  }

  async function saveLimit(id: string, version: number) {
    const amount = parsePaymentAmount(editedLimit);
    if (amount === null) {
      setMessage("invalidLimit");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await update(id, { expectedVersion: version, defaultLimit: amount });
      setEditingId(null);
    } catch (caught) {
      if (isOfflineQueuedError(caught)) {
        setEditingId(null);
        setMessage("queued");
      } else setMessage("updateFailed");
    } finally {
      setBusy(false);
    }
  }

  // Calculate total allocated limit
  const totalAllocated = budgets.reduce((sum, b) => {
    const periodLimit = localMode
      ? guest.data.planningPeriods[`${monthText}:${b.id}`] ?? null
      : periodLimits?.month === monthText
      ? periodLimits.limits[b.id] ?? null
      : null;
    return sum + (periodLimit ?? b.defaultLimit);
  }, 0);

  return (
    <PicketScreen>
      {/* Master Design Screen 08 Top Header */}
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Dự định &amp; Ngân sách
        </Text>
        <View style={styles.headerRightActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.planning)}
            style={styles.iconCircleBtn}
          >
            <AppIcon name="calendar-check-outline" color={colors.ink} size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCreate(true)}
            style={styles.iconCircleBtn}
          >
            <AppIcon name="plus" color={colors.ink} size={22} />
          </Pressable>
        </View>
      </View>

      {/* Month Selector Capsule */}
      <View style={styles.monthSelectorCapsule}>
        <Pressable
          accessibilityLabel={t("previousMonth")}
          accessibilityRole="button"
          onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          style={styles.monthNavArrow}
        >
          <AppIcon name="chevron-left" color={colors.ink} size={18} />
        </Pressable>
        <Text style={styles.monthCapsuleLabel}>
          Tháng {month.getMonth() + 1}, {month.getFullYear()}
        </Text>
        <Pressable
          accessibilityLabel={t("nextMonth")}
          accessibilityRole="button"
          onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          style={styles.monthNavArrow}
        >
          <AppIcon name="chevron-right" color={colors.ink} size={18} />
        </Pressable>
      </View>

      {/* Method Pills: Ngân sách phong bì / Quy tắc 50/30/20 / Đơn giản */}
      <View style={styles.methodPillsRow}>
        <Pressable
          onPress={() => router.push(routes.planning)}
          style={[styles.methodPill, styles.methodPillActive]}
        >
          <Text style={[styles.methodPillText, styles.methodPillTextActive]}>Ngân sách phong bì</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(routes.planning)}
          style={styles.methodPill}
        >
          <Text style={styles.methodPillText}>Quy tắc 50/30/20</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(routes.planning)}
          style={styles.methodPill}
        >
          <Text style={styles.methodPillText}>Đơn giản</Text>
        </Pressable>
      </View>

      {/* Master Summary Hero Card */}
      <View style={styles.heroSummaryCard}>
        <View style={styles.heroSummaryCopy}>
          <Text style={styles.heroSummaryLabel}>Tổng hạn mức đã phân bổ:</Text>
          <Text style={styles.heroSummaryAmount}>{money(totalAllocated)}</Text>
          <Text style={styles.heroSummarySub}>
            / {money(15000000)} thu nhập dự kiến (còn {money(Math.max(0, 15000000 - totalAllocated))})
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowCreate(true)}
          style={styles.addPocketBtn}
        >
          <Text style={styles.addPocketText}>+ Thêm túi</Text>
        </Pressable>
      </View>

      {/* Section: Những chiếc túi của bạn */}
      <Text style={styles.sectionHeading}>Những chiếc túi của bạn</Text>

      {loading && budgets.length === 0 ? (
        <ActivityIndicator accessibilityLabel={t("loading")} color={colors.link} style={styles.loader} />
      ) : null}
      {error ? <ConnectionNotice hasData={budgets.length > 0} onRetry={() => void refresh()} /> : null}
      {periodError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{t(periodError)}</Text> : null}
      {splitError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{t(splitError)}</Text> : null}

      {budgets.length === 0 && !loading ? (
        <EmptyState description={t("emptyDescription")} title={t("emptyTitle")} />
      ) : (
        <View style={styles.pocketsList}>
          {budgets.map((budget) => {
            const visual = appearances[budget.id] ?? defaultPocketAppearance(budget.id, budget.name);
            const periodLimit = localMode
              ? guest.data.planningPeriods[`${monthText}:${budget.id}`] ?? null
              : periodLimits?.month === monthText
              ? periodLimits.limits[budget.id] ?? null
              : null;
            const ready = localMode || cloudSplits?.month === monthText;
            const base = budgetOverview(
              budget,
              monthText,
              transactions,
              periodLimit,
              !localMode && cloudSplits?.month === monthText ? cloudSplits.splits : [],
            );
            const spent = localMode ? guestBudgetSpent(guest.data, budget, monthText) : base.spent;
            const { limit: monthlyLimit } = base;
            const percent = monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 100) : 0;
            const barColor = percent > 100 ? colors.expense : percent > 80 ? "#EA580C" : percent > 50 ? "#F59E0B" : "#10B981";

            return (
              <View key={budget.id} style={styles.masterPocketCard}>
                <View style={styles.pocketTopRow}>
                  <View style={styles.pocketIconBox}>
                    <PaperArt id={resolvePaperAsset(visual.assetId)} style={{ width: 38, height: 38 }} />
                  </View>
                  <View style={styles.pocketCopy}>
                    <Text style={styles.pocketName}>{budget.name}</Text>
                    <Text style={styles.pocketSpentSub}>
                      Đã chi: {ready ? money(spent) : "—"} / {money(monthlyLimit)}
                    </Text>
                  </View>
                  <IconButton
                    icon="dots-vertical"
                    label={t("manageBudget", { name: budget.name })}
                    onPress={() => {
                      setMessage(null);
                      setManagingId(budget.id);
                    }}
                  />
                </View>

                {/* Horizontal Progress Bar matching Master Design Screen 08 */}
                <View style={styles.pocketBarContainer}>
                  <View style={styles.pocketBarTrack}>
                    <View
                      style={[
                        styles.pocketBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, percent))}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.pocketPercentText, { color: percent > 100 ? colors.expense : colors.muted }]}>
                    {percent}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {appearanceError && <Text accessibilityRole="alert" style={styles.error}>{designCopy("pocketCreatedArtError")}</Text>}
      {message && !showCreate && !editing ? <Text accessibilityLiveRegion="polite" style={styles.error}>{t(message)}</Text> : null}

      {/* Action Sheets */}
      <ActionSheet title={managing?.name ?? t("title")} visible={Boolean(managing)} onClose={() => setManagingId(null)}>
        {managing ? (
          <View style={{ gap: 8 }}>
            <MenuRow
              icon="palette-outline"
              title={designCopy("pocketAppearance")}
              onPress={() => {
                setAppearance(appearances[managing.id] ?? defaultPocketAppearance(managing.id, managing.name));
                setAppearanceId(managing.id);
                setManagingId(null);
                setAppearanceError(false);
              }}
            />
            <MenuRow
              icon="pencil-outline"
              title={t("editDefault")}
              onPress={() => {
                setEditedLimit(String(managing.defaultLimit));
                setEditingId(managing.id);
                setManagingId(null);
              }}
            />
            <MenuRow
              icon="receipt-text-outline"
              title={t("viewTransactions")}
              onPress={() => {
                setManagingId(null);
                router.push({ pathname: routes.transactions, params: { categoryId: managing.categoryId, month: monthText } });
              }}
            />
            <DangerAction
              label={t("archive")}
              disabled={busy}
              onPress={() =>
                Alert.alert(t("archiveTitle"), t("archiveDescription"), [
                  { text: t("cancel"), style: "cancel" },
                  {
                    text: t("confirmArchive"),
                    style: "destructive",
                    onPress: () => {
                      setManagingId(null);
                      void archiveBudget(managing.id, managing.version);
                    },
                  },
                ])
              }
            />
          </View>
        ) : null}
      </ActionSheet>

      <ActionSheet title={t("editLimit")} visible={Boolean(editing)} onClose={() => setEditingId(null)}>
        {editing ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.pocketName}>{editing.name}</Text>
            <TextInput
              money
              accessibilityLabel={t("editLimitLabel", { name: editing.name })}
              keyboardType="number-pad"
              onChangeText={setEditedLimit}
              value={editedLimit}
            />
            {message ? <Text accessibilityLiveRegion="polite" style={styles.error}>{t(message)}</Text> : null}
            <PrimaryAction label={t("saveLimit")} busy={busy} onPress={() => void saveLimit(editing.id, editing.version)} />
          </View>
        ) : null}
      </ActionSheet>

      {/* Create Sheet */}
      <ActionSheet
        title={language === "vi" ? "Thêm một chiếc túi" : "Add a pocket"}
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      >
        <Surface style={{ padding: 0, borderWidth: 0, backgroundColor: "transparent" }}>
          <PocketAppearancePicker
            value={appearance}
            onChange={setAppearance}
            name={budgetName.trim() || selected?.name || designCopy("pocketName")}
            amount={parsePaymentAmount(limit) !== null ? money(parsePaymentAmount(limit)!) : "—"}
            disabled={busy}
          />
          <View style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{designCopy("pocketName")}</Text>
              <TextInput
                accessibilityLabel={designCopy("pocketName")}
                value={budgetName}
                maxLength={80}
                onChangeText={setBudgetName}
                placeholder={selected?.name}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t("monthlyLimit")}</Text>
              <TextInput
                money
                accessibilityLabel={t("monthlyLimitLabel")}
                keyboardType="number-pad"
                onChangeText={setLimit}
                placeholder={t("limitPlaceholder")}
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={limit}
              />
            </View>
          </View>
          <Text style={styles.fieldLabel}>{t("category")}</Text>
          {expenseCategories.length === 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldHelp}>{designCopy("pocketNoCategory")}</Text>
              <MenuRow
                icon="plus"
                title={designCopy("pocketAddCategory")}
                onPress={() => {
                  setShowCreate(false);
                  router.push(routes.newCategory);
                }}
              />
            </View>
          )}
          <View accessibilityRole="radiogroup" style={styles.choices}>
            {expenseCategories.map((category) => {
              const active = selected?.id === category.id;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.choice, active && styles.choiceActive]}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{category.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldHelp}>{t("reminderHelp")}</Text>
          {message ? (
            <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>
              {t(message)}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy || !selected }}
            disabled={busy || !selected}
            onPress={() => void add()}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            {busy ? (
              <ActivityIndicator accessibilityLabel={t("creating")} color={colors.onPrimary} />
            ) : (
              <Text style={styles.primaryText}>{t("create")}</Text>
            )}
          </Pressable>
        </Surface>
      </ActionSheet>

      {/* Appearance Customizer Sheet */}
      <ActionSheet
        title={designCopy("pocketAppearance")}
        visible={Boolean(appearanceId)}
        onClose={() => {
          if (!busy) setAppearanceId(null);
        }}
      >
        <PocketAppearancePicker
          value={appearance}
          onChange={setAppearance}
          name={budgets.find((budget) => budget.id === appearanceId)?.name ?? ""}
          amount={money(budgets.find((budget) => budget.id === appearanceId)?.defaultLimit ?? 0)}
          disabled={busy}
        />
        <PrimaryAction
          label={designCopy("pocketAppearanceApply")}
          busy={busy}
          onPress={async () => {
            if (!appearanceId) return;
            setBusy(true);
            try {
              await saveAppearance(appearanceId, appearance);
              setAppearanceId(null);
            } catch {
              setAppearanceError(true);
            } finally {
              setBusy(false);
            }
          }}
        />
      </ActionSheet>
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginBottom: 12,
    },
    headerTitle: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    headerRightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconCircleBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    monthSelectorCapsule: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      alignSelf: "center",
      marginBottom: 12,
      gap: 12,
    },
    monthNavArrow: {
      paddingHorizontal: 6,
    },
    monthArrowText: {
      color: colors.muted,
      fontSize: 16,
      fontWeight: "700",
    },
    monthCapsuleLabel: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "700",
    },
    methodPillsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 16,
    },
    methodPill: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    methodPillActive: {
      backgroundColor: colors.mauve,
      borderColor: colors.mauve,
    },
    methodPillText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    methodPillTextActive: {
      color: colors.onPrimary,
    },
    heroSummaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    heroSummaryCopy: {
      flex: 1,
      paddingRight: 8,
    },
    heroSummaryLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    heroSummaryAmount: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginVertical: 2,
    },
    heroSummarySub: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
    },
    addPocketBtn: {
      backgroundColor: colors.mauve,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addPocketText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    sectionHeading: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 12,
    },
    pocketsList: {
      gap: 12,
      paddingBottom: 40,
    },
    masterPocketCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    pocketTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    pocketIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
    },
    pocketCopy: {
      flex: 1,
    },
    pocketName: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
    },
    pocketSpentSub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    pocketBarContainer: {
      marginTop: 12,
      gap: 4,
    },
    pocketBarTrack: {
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.cream,
      overflow: "hidden",
    },
    pocketBarFill: {
      height: 7,
      borderRadius: 4,
    },
    pocketPercentText: {
      fontSize: 11,
      fontWeight: "700",
      alignSelf: "flex-end",
      marginTop: 2,
    },
    fieldLabel: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 8,
      marginBottom: 4,
    },
    fieldHelp: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.cream,
      borderColor: colors.controlBorder,
      borderRadius: paperShape.input,
      borderWidth: 1,
      color: colors.ink,
      fontSize: 15,
      minHeight: paperControl.height,
      paddingHorizontal: 14,
    },
    choices: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginVertical: 8,
    },
    choice: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: paperShape.chip,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    choiceActive: {
      backgroundColor: colors.mauve,
      borderColor: colors.mauve,
    },
    choiceText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "600",
    },
    choiceTextActive: {
      color: colors.onPrimary,
    },
    primary: {
      backgroundColor: colors.mauve,
      borderRadius: paperShape.button,
      alignItems: "center",
      justifyContent: "center",
      minHeight: paperControl.height,
      marginTop: 14,
    },
    pressed: {
      opacity: 0.85,
    },
    primaryText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    loader: {
      marginVertical: 20,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      marginVertical: 4,
    },
  });
