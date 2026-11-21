type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Phone number of an admin users row, formatted for reading.
 * `contact_phone` (verified and attached, E.164) wins over `auth.users.phone`
 * (SMS sign-up accounts, stored as digits without "+").
 */
export function userPhone(row: Row): string {
  const raw = text(row.contact_phone) || text(row.phone);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("84") && digits.length === 11) {
    const local = digits.slice(2);
    return `+84 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return `+${digits}`;
}

/** Whether the row's phone has been proven by SMS. */
export function userPhoneVerified(row: Row): boolean {
  if (text(row.contact_phone)) return row.contact_phone_verified === true;
  return Boolean(text(row.phone)) && Boolean(row.phone_confirmed_at);
}

/** An account counts as verified when its email or its phone is confirmed. */
export function userVerified(row: Row): boolean {
  return Boolean(row.email_confirmed_at) || userPhoneVerified(row);
}
