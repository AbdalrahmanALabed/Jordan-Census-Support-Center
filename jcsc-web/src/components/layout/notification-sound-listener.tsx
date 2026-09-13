"use client";

import { useNotificationSound } from "@/hooks/use-notification-sound";

/** Invisible listener — plays chime when new in-app notifications arrive. */
export function NotificationSoundListener() {
  useNotificationSound();
  return null;
}
