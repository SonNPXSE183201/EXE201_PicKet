export function partitionSubscriptions<T extends { active: boolean; deletedAt: string | null }>(items: T[]) {
  const visible = items.filter((item) => item.deletedAt === null);
  return {
    active: visible.filter((item) => item.active),
    paused: visible.filter((item) => !item.active),
  };
}
