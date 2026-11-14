import { useLocalSearchParams } from "expo-router";

import { CreatePasswordScreen } from "@/features/auth/create-password-screen";

/** Sign-up password step, or (purpose=reset) the new password after SMS recovery. */
export default function CreatePasswordRoute() {
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  return <CreatePasswordScreen purpose={purpose === "reset" ? "reset" : "signup"} />;
}
