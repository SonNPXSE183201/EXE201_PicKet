"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/core/supabase/client";
import type { AdminSection } from "../admin-permissions";
import { isEditing, realtimeAffects } from "../realtime-policy";

/* Server push for the admin: Supabase triggers broadcast "section changed"
   events on the private topic admin:feed (staff only). The current screen
   re-renders in place with router.refresh() — no polling, no page reload.
   If the connection drops, a slow visible-tab refresh keeps data fresh. */
type State = "connecting" | "live" | "offline";
const debounceMs = 400;
const fallbackMs = 60_000;

export function AdminRealtime({ current }: { current: AdminSection }) {
  const router = useRouter();
  const [state, setState] = useState<State>("connecting");
  const [waiting, setWaiting] = useState(false);
  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let deferred = false;

    const refresh = () => {
      if (disposed) return;
      if (isEditing(document.activeElement as HTMLInputElement | null) || document.querySelector(".ap-date-pop")) {
        deferred = true;
        setWaiting(true);
        return;
      }
      deferred = false;
      setWaiting(false);
      router.refresh();
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, debounceMs);
    };
    const onFocusOut = () => { if (deferred) setTimeout(refresh, 150); };
    const onVisible = () => { if (document.visibilityState === "visible" && deferred) refresh(); };

    const channel = supabase.channel("admin:feed", { config: { private: true } });
    channel.on("broadcast", { event: "change" }, ({ payload }) => {
      if (realtimeAffects((payload as { section?: unknown })?.section, currentRef.current)) schedule();
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
  }, [router]);

  return (
    <>
      <span className={`ap-live is-${state}`} role="status" aria-live="polite"
        title={state === "live" ? "Dữ liệu tự cập nhật khi có thay đổi" : state === "offline" ? "Mất kết nối trực tiếp — tự làm mới mỗi 60 giây" : "Đang kết nối cập nhật trực tiếp"}>
        <i aria-hidden="true" />{state === "live" ? "Trực tiếp" : state === "offline" ? "Ngoại tuyến" : "Đang kết nối"}
      </span>
      {waiting && (
        <button type="button" className="ap-live-update" onClick={() => { setWaiting(false); router.refresh(); }}>
          Có dữ liệu mới · Cập nhật
        </button>
      )}
    </>
  );
}
