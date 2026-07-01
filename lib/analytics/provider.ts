export type AnalyticsEventName =
  | "signup"
  | "classification_created"
  | "classification_completed"
  | "feedback_submitted"
  | "api_key_created"
  | "upgrade_clicked";

export type AnalyticsProvider = {
  track(event: AnalyticsEventName, properties?: Record<string, unknown>): Promise<void>;
};

export class NoopAnalyticsProvider implements AnalyticsProvider {
  async track() {
    return;
  }
}

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  async track(event: AnalyticsEventName, properties: Record<string, unknown> = {}) {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    await fetch(`${process.env.POSTHOG_HOST ?? "https://app.posthog.com"}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        event,
        properties: {
          distinct_id: properties.organizationId ?? "anonymous",
          ...properties
        }
      })
    }).catch(() => undefined);
  }
}

export function getAnalyticsProvider(): AnalyticsProvider {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY ? new PostHogAnalyticsProvider() : new NoopAnalyticsProvider();
}
