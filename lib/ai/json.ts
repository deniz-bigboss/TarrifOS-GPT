export function parseJsonObject<T>(value: string): T {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? trimmed;
  return JSON.parse(body) as T;
}
