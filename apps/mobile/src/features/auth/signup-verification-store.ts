import { useEffect, useState } from "react";

import { picketApi } from "@/core/api/client";
import { firebasePhoneAuthAvailable } from "./firebase-phone-driver";
import {
  availableSignupMethods,
  createSignupVerificationLoader,
  emailOnlyVerification,
  type SignupMethod,
} from "./signup-channels";

const loadVerification = createSignupVerificationLoader();

/** Sign-up methods chosen by admins; email only until the settings load or on any error. */
export function useSignupMethods(): { methods: SignupMethod[]; loading: boolean } {
  const [state, setState] = useState<{ methods: SignupMethod[]; loading: boolean }>({
    methods: availableSignupMethods(emailOnlyVerification, false),
    loading: true,
  });
  useEffect(() => {
    let active = true;
    void loadVerification(picketApi).then((verification) => {
      if (active) setState({ methods: availableSignupMethods(verification, firebasePhoneAuthAvailable()), loading: false });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
