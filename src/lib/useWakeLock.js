import { useEffect, useState } from "react";

// Keeps the screen on while mounted. The browser drops the lock when the page
// is hidden, so it is requested again whenever the page becomes visible.
export function useWakeLock() {
  const [supported] = useState(() => typeof navigator !== "undefined" && "wakeLock" in navigator);

  useEffect(() => {
    if (!supported) return undefined;
    let lock = null;
    let active = true;

    const request = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) lock = next;
        else next.release();
      } catch {
        // Denied, e.g. low battery. The page still works without it.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [supported]);

  return supported;
}
