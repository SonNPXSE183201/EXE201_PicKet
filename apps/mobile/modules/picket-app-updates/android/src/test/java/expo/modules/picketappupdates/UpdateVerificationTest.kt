package expo.modules.picketappupdates

import java.io.ByteArrayInputStream
import java.io.File
import java.security.MessageDigest
import org.junit.Assert.*
import org.junit.Test

class UpdateVerificationTest {
  private val bytes = "signed APK fixture".toByteArray()
  private val hash = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
  private val installed = ApkIdentity("com.picket.mobile", 3, "1.0.2", setOf("trusted"))
  private val candidate = ApkIdentity("com.picket.mobile", 4, "1.0.3", setOf("trusted"))

  @Test fun exactBytesAndHashAreAccepted() {
    verifyUpdateStream(ByteArrayInputStream(bytes), bytes.size.toLong(), hash)
  }
  @Test fun truncationAndExtraBytesAreRejected() {
    for (size in listOf(bytes.size - 1L, bytes.size + 1L)) {
      assertThrows(IllegalArgumentException::class.java) { verifyUpdateStream(ByteArrayInputStream(bytes), size, hash) }
    }
  }
  @Test fun corruptBytesAndUnboundedMetadataAreRejected() {
    assertThrows(IllegalArgumentException::class.java) { verifyUpdateStream(ByteArrayInputStream("wrong".toByteArray()), 5, hash) }
    for (size in listOf(0L, 600_000_000L)) {
      assertThrows(IllegalArgumentException::class.java) { verifyUpdateStream(ByteArrayInputStream(bytes), size, hash) }
    }
    assertThrows(IllegalArgumentException::class.java) { verifyUpdateStream(ByteArrayInputStream(bytes), bytes.size.toLong(), "not-a-hash") }
  }
  @Test fun identitySignatureAndNewerCodeMustAllMatch() {
    verifyApkIdentity(installed, candidate, 4, "1.0.3", setOf("arm64-v8a"), setOf("arm64-v8a"))
    for (changed in listOf(candidate.copy(packageName="foreign.app"), candidate.copy(code=3), candidate.copy(code=5), candidate.copy(version="1.0.4"), candidate.copy(certificates=setOf("foreign")), candidate.copy(certificates=emptySet()))) {
      assertThrows(IllegalArgumentException::class.java) { verifyApkIdentity(installed, changed, 4, "1.0.3", setOf("arm64-v8a"), setOf("arm64-v8a")) }
    }
  }
  @Test fun incompatibleAbiIsRejected() {
    assertThrows(IllegalArgumentException::class.java) { verifyApkIdentity(installed, candidate, 4, "1.0.3", setOf("x86_64"), setOf("arm64-v8a")) }
  }
  @Test fun updatePathsCannotEscapeTheirPrivateDirectory() {
    val root = File(System.getProperty("java.io.tmpdir"), "picket-updates-unit")
    requireUpdateFile(root, File(root, "update.apk"))
    for (file in listOf(File(root.parentFile, "foreign.apk"), File(root, "../foreign.apk"), root)) {
      assertThrows(IllegalArgumentException::class.java) { requireUpdateFile(root, file) }
    }
  }
}
