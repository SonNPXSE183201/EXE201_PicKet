"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/core/supabase/client";
import type { AdminSection } from "../admin-permissions";
import { affectedSections, isEditing } from "../realtime-policy";

/* Live data layer for the admin (SPA-style, still server-rendered):
   1. Warm-up: once the first screen is idle, every screen the staff member may
      open is prefetched into the client cache (3 at a time), so switching tabs
      renders instantly instead of waiting for the server.
   2. Push: Supabase triggers broadcast "section changed" on the private topic
      admin:feed (WebSocket, staff only). The open screen re-renders in place
      (router.refresh, which only re-fetches the current route); other affected
      screens are marked stale.
   3. Stale-while-revalidate: opening a stale screen shows the cached copy at
      once, then refreshes it in the background.
   No polling while connected; if the socket drops, the visible screen refreshes
   every 60 s until it reconnects. */
type State = "connecting" | "live" | "offline";
const debounceMs = 400;
const fallbackMs = 60_000;
const warmBatch = 3;
const warmGapMs = 350;

export function AdminRealtime({ current, screens, freezeCurrent = false }: { current: AdminSection; screens: { section: AdminSection; href: string }[]; freezeCurrent?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>("connecting");
  const [waiting, setWaiting] = useState(false);
  const currentRef = useRef(current);
  const stale = useRef(new Set<AdminSection>());
  const refreshCurrent = useRef<(force?: boolean) => void>(() => undefined);
  const screensKey = screens.map((s) => s.href).join("|");

  // Opening a screen that changed while it was hidden: show cache, then refresh.
  useEffect(() => {
    currentRef.current = current;
    if (!stale.current.has(current)) return;
    stale.current.delete(current);
    const t = setTimeout(() => refreshCurrent.current(), 150);
    return () => clearTimeout(t);
  }, [current]);

  // Warm the client cache with every permitted screen once the page is idle.
  useEffect(() => {
    const targets = screensKey.split("|").filter(Boolean);
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const start = () => {
      targets.forEach((href, i) => {
        timers.push(setTimeout(() => { if (!cancelled) prefetchFull(router, href); }, Math.floor(i / warmBatch) * warmGapMs));
      });
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(start, { timeout: 2500 });
    else timers.push(setTimeout(start, 1200));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [router, screensKey]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let deferred = false;

    const refresh = (force = false) => {
      if (disposed) return;
      if (freezeCurrent && !force) {
        setWaiting(true);
        return;
      }
      if (isEditing(document.activeElement as HTMLInputElement | null) || document.querySelector(".ap-date-pop")) {
        deferred = true;
        setWaiting(true);
        return;
      }
      deferred = false;
      setWaiting(false);
      router.refresh();
    };
    refreshCurrent.current = refresh;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, debounceMs);
    };
    const onFocusOut = () => { if (deferred) setTimeout(refresh, 150); };
    const onVisible = () => { if (document.visibilityState === "visible" && deferred) refresh(); };

    const channel = supabase.channel("admin:feed", { config: { private: true } });
    channel.on("broadcast", { event: "change" }, ({ payload }) => {
      for (const section of affectedSections((payload as { section?: unknown })?.section)) {
        if (section === currentRef.current) schedule();
        else stale.current.add(section);
      }
    });

    void (async () => {
      await supabase.realtime.setAuth();
      if (disposed) return;
      channel.subscribe((status) => {
        if (disposed) return;
        setState(status === "SUBSCRIBED" ? "live" : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "connecting");
      });
    })();

    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible" && channel.state !== "joined") refresh();
    }, fallbackMs);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      window.clearInterval(fallback);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router, freezeCurrent]);

  return (
    <>
      <span className={`ap-live is-${state}`} role="status" aria-live="polite"
        title={state === "live" ? "Dữ liệu tự cập nhật khi có thay đổi" : state === "offline" ? "Mất kết nối trực tiếp — tự làm mới mỗi 60 giây" : "Đang kết nối cập nhật trực tiếp"}>
        <i aria-hidden="true" />{state === "live" ? "Trực tiếp" : state === "offline" ? "Ngoại tuyến" : "Đang kết nối"}
      </span>
      {waiting && (
        <button type="button" className="ap-live-update" onClick={() => { setWaiting(false); refreshCurrent.current(true); }}>
          Có dữ liệu mới · Cập nhật
        </button>
      )}
    </>
  );
}

/** router.prefetch defaults to the lightweight "auto" prefetch (loading shell
    only). Next 16 accepts kind "full" at runtime — the same mode as
    <Link prefetch={true}> — which also fetches the screen's data. */
function prefetchFull(router: ReturnType<typeof useRouter>, href: string) {
  (router.prefetch as (href: string, options?: { kind?: "full" }) => void)(href, { kind: "full" });
}
