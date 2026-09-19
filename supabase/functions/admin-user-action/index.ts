import { admin, json, requireUser } from "../_shared/auth.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const user = await requireUser(request);
    const client = admin();
    const { data: staff, error: staffError } = await client.from(
      "staff_members",
    ).select("user_id").eq("user_id", user.id).maybeSingle();
    const { data: actor, error: actorError } = await client.auth.admin
      .getUserById(user.id);
    const banned = (actor.user as unknown as { banned_until?: string })
      ?.banned_until;
    if (
      staffError || actorError || !staff ||
      (banned && Date.parse(banned) > Date.now())
    ) return json({ error: "Staff required" }, 403);
    const body = await request.text();
    if (body.length > 2000) return json({ error: "Request too large" }, 413);
    const { targetUser, action, tier } = JSON.parse(body);
    if (
      typeof targetUser !== "string" ||
      !["suspend", "restore", "reset_password", "grant_plan"].includes(action)
    ) return json({ error: "Invalid action" }, 400);
    const { data: target, error } = await client.auth.admin.getUserById(
      targetUser,
    );
    if (error || !target.user) return json({ error: "User not found" }, 404);
    if (action === "suspend") {
      const { data: targetStaff } = await client.from("staff_members").select(
        "user_id",
      ).eq("user_id", targetUser).maybeSingle();
      if (targetUser === user.id || targetStaff) {
        return json({ error: "Cannot suspend staff" }, 403);
      }
    }
    if (action === "suspend" || action === "restore") {
      const { error } = await client.auth.admin.updateUserById(targetUser, {
        ban_duration: action === "suspend" ? "876000h" : "none",
      });
      if (error) throw error;
    } else if (action === "reset_password") {
      if (!target.user.email) return json({ error: "User has no email" }, 400);
      const { error } = await client.auth.resetPasswordForEmail(
        target.user.email,
        { redirectTo: "com.picket.mobile://auth/callback" },
      );
      if (error) throw error;
    } else {
      if (!["free", "plus", "pro"].includes(tier)) {
        return json({ error: "Invalid tier" }, 400);
      }
      const result = tier === "free"
        ? await client.from("plan_grants").delete().eq("user_id", targetUser)
        : await client.from("plan_grants").upsert({
          user_id: targetUser,
          tier,
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
          granted_by: user.id,
        });
      if (result.error) throw result.error;
    }
    const audit = await client.from("admin_audit").insert({
      actor: user.id,
      action,
      target: targetUser,
    });
    if (audit.error) throw audit.error;
    return json({ updated: true });
  } catch (_) {
    return json({ error: "Unable to complete action" }, 503);
  }
});
