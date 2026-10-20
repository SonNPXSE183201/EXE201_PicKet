import { colors } from "@picket/design-tokens";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, Text } from "react-native";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Surface } from "@/core/ui/picket-ui";
import { safePartnerUrl, selectPartnerAd, visiblePartnerNotice, type PartnerNoticeSnapshot } from "./partner-notice-policy";
import { useAuth } from "@/features/auth/auth-context";

export function PartnerNotice() {
  const { session } = useAuth();
  const owner = session?.user.id;
  const [snapshot, setSnapshot] = useState<PartnerNoticeSnapshot | null>(null);
  const visible = visiblePartnerNotice(owner, snapshot);
  const notice = visible?.notice ?? "";
  const ad = visible?.ad ?? null;
  useFocusEffect(useCallback(() => {
    if (!session || !supabase) { setSnapshot(null); return; }
    let active = true;
    const isCurrent = () => active;
    void Promise.all([
      supabase.from("app_settings").select("notice").eq("id", true).single(),
      supabase.from("partner_ads").select("id,title,body,url,active,created_at").eq("active", true).order("created_at", { ascending:false }).limit(1),
      picketApi?.currentEntitlements(session.access_token).catch(() => null) ?? Promise.resolve(null),
    ]).then(([settings, ads, entitlement]) => {
      if (!isCurrent()) return;
      setSnapshot({ owner: session.user.id,
        notice: typeof settings.data?.notice === "string" ? settings.data.notice : "",
        ad: selectPartnerAd(entitlement?.tier, ads.error ? [] : ads.data ?? []),
      });
    }).catch(() => { if (isCurrent()) setSnapshot(null); });
    return () => { active = false; };
  }, [session]));
  if (!notice && !ad) return null;
  return <>
    {notice ? <Surface peach><Text style={styles.label}>THÔNG BÁO TỪ PICKET</Text><Text style={styles.copy}>{notice}</Text></Surface> : null}
    {ad && safePartnerUrl(ad.url) ? <Pressable accessibilityLabel={`Nội dung đối tác: ${ad.title}. Mở liên kết.`} accessibilityRole="link" onPress={() => void Linking.openURL(ad.url).catch(() => undefined)}><Surface><Text style={styles.label}>NỘI DUNG ĐỐI TÁC</Text><Text style={styles.title}>{ad.title}</Text><Text style={styles.copy}>{ad.body}</Text><Text style={styles.link}>Tìm hiểu thêm ↗</Text></Surface></Pressable> : null}
  </>;
}

const styles = StyleSheet.create({label:{color:colors.mauve,fontSize:11,fontWeight:"800",letterSpacing:1},title:{color:colors.ink,fontSize:17,fontWeight:"800",marginTop:8},copy:{color:colors.ink,fontSize:14,lineHeight:21,marginTop:7},link:{color:colors.mauve,fontSize:13,fontWeight:"800",marginTop:10}});
