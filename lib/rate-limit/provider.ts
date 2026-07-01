import { ensurePlanAllowance } from "@/lib/db/repository";

export type RateLimitProvider = {
  assertClassificationAllowed(organizationId: string): Promise<void>;
};

export class DatabaseRateLimitProvider implements RateLimitProvider {
  async assertClassificationAllowed(organizationId: string) {
    await ensurePlanAllowance(organizationId);
  }
}

export class FutureUpstashRateLimitProvider implements RateLimitProvider {
  async assertClassificationAllowed(): Promise<void> {
    throw new Error("FutureUpstashRateLimitProvider is disabled. Database usage limits are the MVP default.");
  }
}

export function getRateLimitProvider(): RateLimitProvider {
  return new DatabaseRateLimitProvider();
}
