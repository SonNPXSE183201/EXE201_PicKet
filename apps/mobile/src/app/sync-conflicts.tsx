import { Redirect } from "expo-router";
import { routes } from "@/core/navigation/routes";
import { useAuth } from "@/features/auth/auth-context";
import { ConflictScreenContent } from "@/features/sync/conflict-screen";

export default function SyncConflictsScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href={routes.login} />;
  return <ConflictScreenContent key={session.user.id} owner={session.user.id} />;
}
