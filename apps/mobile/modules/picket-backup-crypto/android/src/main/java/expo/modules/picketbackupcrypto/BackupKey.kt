package expo.modules.picketbackupcrypto

import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/** Platform PBKDF2, identical to the portable backup format. No custom cipher. */
internal fun deriveBackupKey(password: String, salt: ByteArray): ByteArray {
  require(password.isNotEmpty() && salt.size == 32) { "Invalid backup key parameters" }
  val chars = password.toCharArray()
  val spec = PBEKeySpec(chars, salt, 210_000, 256)
  try {
    return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
  } finally {
    spec.clearPassword()
    chars.fill('\u0000')
  }
}
