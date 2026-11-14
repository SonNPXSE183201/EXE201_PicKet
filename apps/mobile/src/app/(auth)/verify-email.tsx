import { Redirect, useLocalSearchParams } from "expo-router";

import { routes } from "@/core/navigation/routes";

/** Older links and builds opened this route; email sign-up codes now use verify-code. */
export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return <Redirect href={email ? routes.verifyCode("email", email) : routes.register} />;
}
