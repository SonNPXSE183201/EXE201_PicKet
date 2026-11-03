/** Accept Vietnamese mobile numbers and explicit E.164 international numbers. */
export function normalizePhoneNumber(input: string): string {
  let phone = input.trim().replace(/[\s().-]/g, "");
  if (/^0[35789]\d{8}$/.test(phone)) phone = `+84${phone.slice(1)}`;
  if (
    !/^\+[1-9]\d{7,14}$/.test(phone) ||
    (phone.startsWith("+84") && !/^\+84[35789]\d{8}$/.test(phone))
  ) {
    throw new Error("Số điện thoại không hợp lệ.");
  }
  return phone;
}

export type PasswordLoginCredentials =
  | { email: string; password: string; phone?: never }
  | { phone: string; password: string; email?: never };

/** Compatibility login selects one Auth identity without creating/linking users. */
export function passwordLoginCredentials(
  identifier: string,
  password: string,
): PasswordLoginCredentials {
  const value = identifier.trim();
  if (value.includes("@")) {
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error("Email hoặc số điện thoại không hợp lệ.");
    }
    return { email: value.toLowerCase(), password };
  }
  try {
    return { phone: normalizePhoneNumber(value), password };
  } catch {
    throw new Error("Email hoặc số điện thoại không hợp lệ.");
  }
}
