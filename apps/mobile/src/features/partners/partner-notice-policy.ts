export interface PartnerNoticeAd {
  id: string; title: string; body: string; url: string; active: boolean; created_at: string;
}
export type PartnerNoticeSnapshot = { owner: string; notice: string; ad: PartnerNoticeAd | null };

export function safePartnerUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

/** Unknown entitlement is deliberately not treated as a free subscription. */
export function selectPartnerAd(tier: string | null | undefined, ads: PartnerNoticeAd[]) {
  if (tier !== "free") return null;
  return ads.find(ad => ad.active && safePartnerUrl(ad.url)) ?? null;
}

export function visiblePartnerNotice(owner: string | undefined, snapshot: PartnerNoticeSnapshot | null) {
  return owner && snapshot?.owner === owner ? snapshot : null;
}
