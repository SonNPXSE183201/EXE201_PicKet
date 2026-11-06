package expo.modules.picketbackupcrypto

import org.junit.Assert.assertEquals
import org.junit.Test

class BackupKeyTest {
  @Test fun portableUnicodeVectors() {
    val salt = ByteArray(32) { it.toByte() }
    val vectors = listOf(
      "correct horse battery staple" to "760eda82dfb2d789362bd6b7a001be36675db388296e9783f774563efcd9fc82",
      "Mật-khẩu-đủ-dài-🔐" to "b5fb8b064596ac66781781f95d7a407d0bb43dcd7dace7a3e1a1ccc9ff41300e",
      "Ma\u0323t-kha\u0302\u0309u-123456" to "b748088d41f1c23e29f9f8a55aa981bfcb5d4797a996fed13cb33d4d3fd14786",
      "nul\u0000inside-long-password" to "e11b371884e3a6308de71c5db12ff6574292ff0e66fbbf4978ad15fb34953dcf"
    )
    for ((password, expected) in vectors) {
      assertEquals(expected, deriveBackupKey(password, salt).joinToString("") { "%02x".format(it.toInt() and 255) })
    }
  }

  @Test(expected = IllegalArgumentException::class) fun rejectsWrongSaltLength() {
    deriveBackupKey("long-password", ByteArray(12))
  }
}
