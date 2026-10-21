export interface PartnerNoticeAd {
  id: string; title: string; body: string; url: string; active: boolean; created_at: string;
  starts_at?: string | null; ends_at?: string | null;
}
export type PartnerNoticeSnapshot = { owner: string; notice: string; ad: PartnerNoticeAd | null };

export function safePartnerUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

/** Unknown entitlement is deliberately not treated as a free subscription. */
export function isPartnerAdEffective(ad: PartnerNoticeAd, now = Date.now()) {
  const start = ad.starts_at == null ? -Infinity : Date.parse(ad.starts_at);
  const end = ad.ends_at == null ? Infinity : Date.parse(ad.ends_at);
  return Number.isFinite(now) && !Number.isNaN(start) && !Number.isNaN(end)
    && start < end && start <= now && now < end;
}

export function selectPartnerAd(tier: string | null | undefined, ads: PartnerNoticeAd[], now = Date.now()) {
  if (tier !== "free") return null;
  return ads.find(ad => ad.active && safePartnerUrl(ad.url) && isPartnerAdEffective(ad, now)) ?? null;
}

export function visiblePartnerNotice(owner: string | undefined, snapshot: PartnerNoticeSnapshot | null, now = Date.now()) {
  if (!owner || snapshot?.owner !== owner) return null;
  return snapshot.ad && !isPartnerAdEffective(snapshot.ad, now) ? { ...snapshot, ad: null } : snapshot;
}
