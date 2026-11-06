export async function loadReminderKeepsakes<T>(input: {
  localMode: boolean;
  token: string | null;
  userId: string;
  loadLocal(userId: string): Promise<T[]>;
  loadCloud(token: string, userId: string): Promise<T[]>;
}) {
  if (input.localMode) return input.loadLocal(input.userId);
  if (!input.token) return [];
  return input.loadCloud(input.token, input.userId);
}
