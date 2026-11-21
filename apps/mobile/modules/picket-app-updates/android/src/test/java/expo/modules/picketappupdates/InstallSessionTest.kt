package expo.modules.picketappupdates

import android.content.pm.PackageInstaller
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import org.junit.Assert.*
import org.junit.Test

class InstallSessionTest {
  private val bytes = "signed APK fixture".toByteArray()
  private val hash = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

  @Test fun copyWritesExactlyTheVerifiedBytes() {
    val output = ByteArrayOutputStream()
    copyVerifiedUpdate(ByteArrayInputStream(bytes), output, bytes.size.toLong(), hash)
    assertArrayEquals(bytes, output.toByteArray())
  }

  @Test fun copyRejectsTamperedOrOversizedContent() {
    val tampered = bytes.copyOf().also { it[0] = (it[0] + 1).toByte() }
    assertThrows(IllegalArgumentException::class.java) { copyVerifiedUpdate(ByteArrayInputStream(tampered), ByteArrayOutputStream(), bytes.size.toLong(), hash) }
    assertThrows(IllegalArgumentException::class.java) { copyVerifiedUpdate(ByteArrayInputStream(bytes + 1), ByteArrayOutputStream(), bytes.size.toLong(), hash) }
  }

  @Test fun sessionStatusesMapToJsOutcomes() {
    assertEquals(SessionOutcome.Resolved("started"), sessionOutcome(PackageInstaller.STATUS_SUCCESS))
    assertEquals(SessionOutcome.Resolved("pending-user-action"), sessionOutcome(PackageInstaller.STATUS_PENDING_USER_ACTION))
    assertEquals(SessionOutcome.Rejected("ERR_INSTALL_ABORTED"), sessionOutcome(PackageInstaller.STATUS_FAILURE_ABORTED))
    assertEquals(SessionOutcome.Rejected("ERR_INSTALL_CONFLICT"), sessionOutcome(PackageInstaller.STATUS_FAILURE_CONFLICT))
    assertEquals(SessionOutcome.Rejected("ERR_INSTALL_FAILED"), sessionOutcome(PackageInstaller.STATUS_FAILURE))
    assertEquals(SessionOutcome.Rejected("ERR_INSTALL_FAILED"), sessionOutcome(8))
  }

  @Test fun batteryPercentPrefersCapacityThenLevelAndNeverBlocksWhenUnknown() {
    assertEquals(42, batteryPercent(42, 10, 100))
    assertEquals(50, batteryPercent(Int.MIN_VALUE, 1, 2))
    assertEquals(100, batteryPercent(Int.MIN_VALUE, -1, -1))
    assertEquals(100, batteryPercent(-1, 5, 0))
  }
}
