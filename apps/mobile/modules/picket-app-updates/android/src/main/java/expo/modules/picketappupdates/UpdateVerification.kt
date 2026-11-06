package expo.modules.picketappupdates

import java.io.File
import java.io.InputStream
import java.security.MessageDigest

data class ApkIdentity(val packageName: String, val code: Long, val version: String, val certificates: Set<String>)

fun verifyUpdateStream(input: InputStream, expectedBytes: Long, expectedHash: String) {
  require(expectedBytes in 1..(500L * 1024 * 1024) && expectedHash.matches(Regex("[a-f0-9]{64}"))) { "Invalid update metadata" }
  val digest = MessageDigest.getInstance("SHA-256")
  var total = 0L
  input.use { stream ->
    val buffer = ByteArray(64 * 1024)
    while (true) {
      val count = stream.read(buffer)
      if (count < 0) break
      total += count
      require(total <= expectedBytes) { "Update exceeds expected size" }
      digest.update(buffer, 0, count)
    }
  }
  val actual = digest.digest().joinToString("") { "%02x".format(it) }
  require(total == expectedBytes && MessageDigest.isEqual(actual.toByteArray(), expectedHash.toByteArray())) { "Update integrity mismatch" }
}

fun verifyApkIdentity(installed: ApkIdentity, archive: ApkIdentity, expectedCode: Long, expectedVersion: String, supportedAbis: Set<String>, archiveAbis: Set<String>) {
  require(archive.packageName == installed.packageName && archive.code > installed.code
    && archive.code == expectedCode && archive.version == expectedVersion) { "Update package or version mismatch" }
  // Fail closed on signing rotation; never recommend uninstalling to bypass it.
  require(archive.certificates.isNotEmpty() && archive.certificates == installed.certificates) { "Update signing mismatch" }
  require(archiveAbis.any { it in supportedAbis }) { "Unsupported update ABI" }
}

fun requireUpdateFile(directory: File, file: File) {
  require(file.canonicalFile.parentFile == directory.canonicalFile && file.canonicalFile != directory.canonicalFile) { "Update file is outside private cache" }
}
