import { normalizePhoneNumber } from "@picket/domain";

export const vietnamPhonePrefix = "+84";
export const invalidLocalPhoneMessage = "Số điện thoại chưa đúng. Kiểm tra lại 10 số.";

/** Keeps digits only and drops a leading 84/0 the user may type after the fixed +84 box. */
export function sanitizeLocalPhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** Local number typed next to the +84 box (with or without the leading 0) to E.164, or null. */
export function vietnamPhoneToE164(local: string): string | null {
  const digits = local.replace(/\D/g, "");
  const national = digits.startsWith("84") && digits.length === 11 ? digits.slice(2) : digits.replace(/^0/, "");
  if (!/^\d{9}$/.test(national)) return null;
  try {
    const phone = normalizePhoneNumber(`${vietnamPhonePrefix}${national}`);
    return phone.startsWith(vietnamPhonePrefix) ? phone : null;
  } catch {
    return null;
  }
}

/** "+84912345678" -> "+84 912 345 678" for the OTP destination line. */
export function formatVietnamPhone(e164: string): string {
  const match = /^\+84(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return match ? `+84 ${match[1]} ${match[2]} ${match[3]}` : e164;
}
