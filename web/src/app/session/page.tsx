import { redirect } from "next/navigation";
import { requireApiSession } from "@/core/auth/require-api-session";

export default async function SessionPage() {
  const { staff } = await requireApiSession("either");
  redirect(staff ? "/admin" : "/dashboard");
}
