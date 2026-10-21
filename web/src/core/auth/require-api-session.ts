import { PicketApiClient } from "@picket/api-client";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { workspaceRedirect } from "./workspace-policy";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function requireApiSession(
  workspace: "user" | "admin" | "either" = "user",
) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect("/login");

  const { data: staff, error: roleError } = await supabase.rpc("is_staff");
  if (roleError || typeof staff !== "boolean")
    throw new Error("Không xác minh được quyền truy cập. Vui lòng thử lại.");
  const destination =
    workspace === "either"
      ? null
      : workspaceRedirect(
          staff,
          workspace === "admin" ? "/admin" : "/dashboard",
        );
  if (destination) redirect(destination);

  return {
    accessToken,
    api: new PicketApiClient(apiBaseUrl),
    claims: claimsData.claims,
    staff,
  };
}
