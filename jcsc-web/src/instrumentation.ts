export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEscalationScheduler } = await import(
      "@/lib/notifications/escalation-scheduler"
    );
    startEscalationScheduler();
  }
}
