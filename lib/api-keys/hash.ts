import { createHash, randomBytes } from "crypto";

export function hashApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createRawApiKey() {
  return `tariffos_test_key_${randomBytes(24).toString("base64url")}`;
}

export function apiKeyPrefix(value: string) {
  return value.slice(0, 22);
}
