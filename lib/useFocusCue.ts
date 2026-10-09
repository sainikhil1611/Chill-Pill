"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getActivity,
  onActivityUpdated,
  onExtensionReady,
  resetToday,
  setTracking,
  type FocusCueSnapshot,
} from "@/lib/focuscueBridge";

export type ConnectionState = "checking" | "connected" | "not-found";

export function useFocusCue() {
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [snapshot, setSnapshot] = useState<FocusCueSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubReady = onExtensionReady(() => {
      if (cancelled) return;
      setConnection("connected");
    });
    const unsubUpdate = onActivityUpdated((payload) => {
      if (cancelled) return;
      setConnection("connected");
      setSnapshot(payload);
    });

    // The extension may have injected and announced itself before this effect ran
    // (FOCUSCUE_EXTENSION_READY only fires once, at content-script load), so ask directly too.
    void getActivity().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setConnection("connected");
        setSnapshot(res.payload);
      }
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled) setConnection((prev) => (prev === "checking" ? "not-found" : prev));
    }, 1500);

    return () => {
      cancelled = true;
      unsubReady();
      unsubUpdate();
      window.clearTimeout(timeout);
    };
  }, []);

  const toggleTracking = useCallback(async (enabled: boolean) => {
    const res = await setTracking(enabled);
    if (res.ok) setSnapshot(res.payload);
    return res;
  }, []);

  const reset = useCallback(async () => {
    const res = await resetToday();
    if (res.ok) setSnapshot(res.payload);
    return res;
  }, []);

  const refresh = useCallback(async () => {
    const res = await getActivity();
    if (res.ok) {
      setConnection("connected");
      setSnapshot(res.payload);
    } else {
      setConnection((prev) => (prev === "connected" ? prev : "not-found"));
    }
    return res;
  }, []);

  return { connection, snapshot, toggleTracking, reset, refresh };
}
