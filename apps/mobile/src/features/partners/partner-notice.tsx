import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet } from "react-native";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Surface } from "@/core/ui/picket-ui";
import { safePartnerUrl, selectPartnerAd, visiblePartnerNotice, type PartnerNoticeSnapshot } from "./partner-notice-policy";
import { useAuth } from "@/features/auth/auth-context";

export function PartnerNotice() {
  const { styles } = useMobileStyles(createStyles);
  const { session } = useAuth();
  const owner = session?.user.id;
  const [snapshot, setSnapshot] = useState<PartnerNoticeSnapshot | null>(null);
  const [now, setNow] = useState(Date.now);
  const visible = visiblePartnerNotice(owner, snapshot, now);
  const notice = visible?.notice ?? "";
  const ad = visible?.ad ?? null;
  useEffect(() => {
    const end = snapshot?.ad?.ends_at;
    if (!end) return;
    const delay = Date.parse(end) - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(delay + 1, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [now, snapshot]);
  useFocusEffect(useCallback(() => {
    if (!session || !supabase) { setSnapshot(null); return; }
    const client = supabase;
    let active = true;
    let revision = 0;
    const isCurrent = (request: number) => active && request === revision;
    const load = () => {
      const request = ++revision;
      void Promise.all([
      client.from("app_settings").select("notice").eq("id", true).single(),
      // '*' remains compatible with deployments predating optional period columns.
      client.from("partner_ads").select("*").eq("active", true).order("created_at", { ascending:false }).limit(50),
      picketApi?.currentEntitlements(session.access_token).catch(() => null) ?? Promise.resolve(null),
    ]).then(([settings, ads, entitlement]) => {
      if (!isCurrent(request)) return;
      setNow(Date.now());
      setSnapshot({ owner: session.user.id,
        notice: typeof settings.data?.notice === "string" ? settings.data.notice : "",
        ad: selectPartnerAd(entitlement?.tier, ads.error ? [] : ads.data ?? []),
      });
    }).catch(() => { if (isCurrent(request)) setSnapshot(null); });
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [session]));
  if (!notice && !ad) return null;
  return <>
    {notice ? <Surface peach><Text style={styles.label}>THÔNG BÁO TỪ PICKET</Text><Text style={styles.copy}>{notice}</Text></Surface> : null}
    {ad && safePartnerUrl(ad.url) ? <Pressable accessibilityLabel={`Nội dung đối tác: ${ad.title}. Mở liên kết.`} accessibilityRole="link" onPress={() => void Linking.openURL(ad.url).catch(() => undefined)}><Surface><Text style={styles.label}>NỘI DUNG ĐỐI TÁC</Text><Text style={styles.title}>{ad.title}</Text><Text style={styles.copy}>{ad.body}</Text><Text style={styles.link}>Tìm hiểu thêm ↗</Text></Surface></Pressable> : null}
  </>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({label:{color:colors.link,fontSize:11,fontWeight:"700",letterSpacing:1},title:{color:colors.ink,fontSize:17,fontWeight:"700",marginTop:8},copy:{color:colors.ink,fontSize:14,lineHeight:21,marginTop:7},link:{color:colors.link,fontSize:13,fontWeight:"700",marginTop:10}});
