"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@/lib/services";
import {
  isNotificationSoundEnabled,
  playNotificationSound,
  unlockNotificationAudio,
} from "@/lib/notifications/sound";

/** Plays a short chime when unread notification count increases. */
export function useNotificationSound() {
  const previousCount = useRef<number | null>(null);
  const initialized = useRef(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      previousCount.current = unreadCount;
      initialized.current = true;
      return;
    }

    const prev = previousCount.current ?? 0;
    if (unreadCount > prev && isNotificationSoundEnabled()) {
      playNotificationSound();
    }
    previousCount.current = unreadCount;
  }, [unreadCount]);
}
