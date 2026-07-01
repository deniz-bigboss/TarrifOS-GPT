export async function captureError(error: unknown, context: Record<string, unknown> = {}) {
  if (!process.env.SENTRY_DSN) {
    console.error("TariffOS error", { error, context });
    return;
  }

  console.error("Sentry DSN configured; SDK integration is a future upgrade.", { error, context });
}
