type RecoveryAuth = {
  getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
};

export async function verifyCacheRecoveryOwner(auth: RecoveryAuth, accessToken: string): Promise<string> {
  if (!accessToken) throw Error("Account verification unavailable");
  const { data, error } = await auth.getUser(accessToken);
  if (error || !data.user?.id) throw Error("Account verification unavailable");
  return data.user.id;
}
