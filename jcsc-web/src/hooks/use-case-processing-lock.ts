"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateCaseLockToken } from "@/lib/case-lock-client";
import { withBasePath } from "@/lib/base-path";
import type { CaseLockInfo } from "@/lib/cases/processing-lock";

const HEARTBEAT_MS = 60_000;

type LockState = {
  loading: boolean;
  heldByMe: boolean;
  blockedByOther: boolean;
  lockedByUserName?: string;
};

export function useCaseProcessingLock(caseId: string | undefined, enabled: boolean) {
  const lockTokenRef = useRef("");
  const [state, setState] = useState<LockState>({
    loading: Boolean(enabled && caseId),
    heldByMe: false,
    blockedByOther: false,
  });

  const acquire = useCallback(async () => {
    if (!caseId || !enabled) {
      setState({ loading: false, heldByMe: false, blockedByOther: false });
      return;
    }

    const lockToken = getOrCreateCaseLockToken(caseId);
    lockTokenRef.current = lockToken;

    try {
      const res = await fetch(withBasePath(`/api/cases/${caseId}/lock`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockToken }),
      });

      if (res.ok) {
        setState({ loading: false, heldByMe: true, blockedByOther: false });
        return;
      }

      const body = (await res.json().catch(() => ({}))) as CaseLockInfo & { error?: string };
      setState({
        loading: false,
        heldByMe: false,
        blockedByOther: true,
        lockedByUserName: body.lockedByUserName ?? "مستخدم آخر",
      });
    } catch {
      setState({ loading: false, heldByMe: false, blockedByOther: false });
    }
  }, [caseId, enabled]);

  const release = useCallback(() => {
    if (!caseId || !lockTokenRef.current) return;
    const lockToken = lockTokenRef.current;
    const payload = JSON.stringify({ lockToken });
    const url = withBasePath(`/api/cases/${caseId}/lock`);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [caseId]);

  useEffect(() => {
    if (!enabled || !caseId) {
      setState({ loading: false, heldByMe: false, blockedByOther: false });
      return;
    }

    void acquire();
    const heartbeat = window.setInterval(() => {
      void acquire();
    }, HEARTBEAT_MS);

    const onUnload = () => release();
    window.addEventListener("pagehide", onUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", onUnload);
      release();
    };
  }, [caseId, enabled, acquire, release]);

  return {
    ...state,
    canProcess: enabled && state.heldByMe && !state.loading,
    refreshLock: acquire,
  };
}
