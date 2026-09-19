import { admin, json, requireUser } from "../_shared/auth.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const user = await requireUser(request);
    if (
      !user.last_sign_in_at ||
      Date.now() - Date.parse(user.last_sign_in_at) > 5 * 60 * 1000
    ) return json({ error: "Recent sign-in required" }, 403);
    const client = admin();
    // CloudMedia stores flat, content-addressed names under the owner UUID.
    for (;;) {
      const { data: files, error } = await client.storage.from("picket-media")
        .list(user.id, { limit: 100 });
      if (error) throw error;
      if (!files?.length) break;
      const { error: removeError } = await client.storage.from("picket-media")
        .remove(files.map((file) => `${user.id}/${file.name}`));
      if (removeError) throw removeError;
    }
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ deleted: true });
  } catch (_) {
    return json(
      { error: "Unable to delete account; retry after signing in" },
      503,
    );
  }
});
