import { cookies } from "next/headers";

/** True when this browser has a saved PIN device (set by lockWithPin). */
export async function hasPinDevice() {
  return Boolean((await cookies()).get("picket_quick_device")?.value);
}
