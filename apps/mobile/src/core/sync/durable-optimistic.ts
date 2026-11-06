export async function persistOptimisticCollection<T extends { id: string }>({
  current,
  optimistic,
  persist,
  publish,
}: {
  current: T[];
  optimistic: T;
  persist: (items: T[]) => Promise<void>;
  publish: (items: T[]) => void;
}) {
  const next = [optimistic, ...current.filter((item) => item.id !== optimistic.id)];
  await persist(next);
  publish(next);
  return next;
}
