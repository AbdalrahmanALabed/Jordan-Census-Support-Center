/** Runs escalation checks on an interval while the dev server is up. */
let started = false;

export function startEscalationScheduler() {
  if (started || process.env.NODE_ENV === "test") return;
  started = true;

  const minutes = parseInt(process.env.ESCALATION_POLL_MINUTES ?? "5", 10);
  const intervalMs = (Number.isFinite(minutes) ? minutes : 5) * 60 * 1000;

  const tick = async () => {
    try {
      const { processEscalations } = await import("@/lib/notifications/escalation");
      await processEscalations();
    } catch (err) {
      console.error("[escalation-scheduler]", err);
    }
  };

  void tick();
  setInterval(tick, intervalMs);
  console.info(`[escalation-scheduler] every ${minutes} min`);
}
