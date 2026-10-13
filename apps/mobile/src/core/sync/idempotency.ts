export function makeIdempotencyKey(userId: string): string {
  const random = Math.random().toString(36).slice(2);
  return `${userId}:${Date.now()}:${random}`;
}
