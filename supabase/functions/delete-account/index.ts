import { admin, json, requireUser } from "../_shared/auth.ts";

async function ownedStoragePaths(
  client: ReturnType<typeof admin>,
  ownerId: string,
) {
  const folders = [ownerId];
  const files: string[] = [];
  while (folders.length > 0) {
    const prefix = folders.shift()!;
    let offset = 0;
    for (;;) {
      const { data: entries, error } = await client.storage.from("picket-media")
        .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      for (const entry of entries ?? []) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id) files.push(path);
        else folders.push(path);
      }
      if ((entries?.length ?? 0) < 100) break;
      offset += 100;
      if (files.length + folders.length > 10000) {
        throw new Error("Storage deletion limit exceeded");
      }
    }
  }
  return files;
}

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
    const paths = await ownedStoragePaths(client, user.id);
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { error: removeError } = await client.storage.from("picket-media")
        .remove(paths.slice(offset, offset + 100));
      if (removeError) throw removeError;
    }
    const { error: purgeError } = await client.rpc("purge_user_data", {
      p_user_id: user.id,
    });
    if (purgeError) throw purgeError;
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ deleted: true });
  } catch (error) {
    return json(
      {
        error: error instanceof Error && error.message === "Unauthorized"
          ? "Unauthorized"
          : "Unable to delete account; retry after signing in",
      },
      error instanceof Error && error.message === "Unauthorized" ? 401 : 503,
    );
  }
});
