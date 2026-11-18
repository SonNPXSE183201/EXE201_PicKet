package expo.modules.picketplayupdates

import com.google.android.play.core.install.model.ActivityResult
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import org.junit.Assert.*
import org.junit.Test

class PlayUpdateMappingTest {
  private val base = PlayUpdateSnapshot(UpdateAvailability.UPDATE_NOT_AVAILABLE, InstallStatus.UNKNOWN, 0, 0, null, false, false)

  @Test fun noUpdateIsNotAvailable() {
    val info = playUpdateInfoMap(base)
    assertEquals(false, info["available"])
    assertEquals(false, info["inProgress"])
    assertEquals(false, info["downloaded"])
    assertNull(info["stalenessDays"])
  }

  @Test fun availableUpdateCarriesPlayMetadata() {
    val info = playUpdateInfoMap(base.copy(updateAvailability = UpdateAvailability.UPDATE_AVAILABLE, availableVersionCode = 36,
      priority = 4, stalenessDays = 3, flexibleAllowed = true, immediateAllowed = true))
    assertEquals(true, info["available"])
    assertEquals(false, info["inProgress"])
    assertEquals(36, info["availableVersionCode"])
    assertEquals(4, info["priority"])
    assertEquals(3, info["stalenessDays"])
    assertEquals(true, info["flexibleAllowed"])
    assertEquals(true, info["immediateAllowed"])
  }

  @Test fun developerTriggeredUpdateIsAvailableAndInProgress() {
    val info = playUpdateInfoMap(base.copy(updateAvailability = UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS))
    assertEquals(true, info["available"])
    assertEquals(true, info["inProgress"])
  }

  @Test fun downloadedFlexibleUpdateIsReported() {
    assertEquals(true, playUpdateInfoMap(base.copy(installStatus = InstallStatus.DOWNLOADED))["downloaded"])
    assertEquals(false, playUpdateInfoMap(base.copy(installStatus = InstallStatus.DOWNLOADING))["downloaded"])
  }

  @Test fun priorityIsClampedToPlayRange() {
    assertEquals(5, playUpdateInfoMap(base.copy(priority = 9))["priority"])
    assertEquals(0, playUpdateInfoMap(base.copy(priority = -1))["priority"])
  }

  @Test fun installStatusesMapToTheJsUnion() {
    val expected = mapOf(
      InstallStatus.PENDING to "pending",
      InstallStatus.DOWNLOADING to "downloading", InstallStatus.DOWNLOADED to "downloaded",
      InstallStatus.INSTALLING to "installing", InstallStatus.INSTALLED to "installed",
      InstallStatus.FAILED to "failed", InstallStatus.CANCELED to "canceled",
    )
    for ((status, name) in expected) assertEquals(name, installStatusName(status))
    assertNull(installStatusName(InstallStatus.UNKNOWN))
    assertNull(installStatusName(10)) // REQUIRES_UI_INTENT (deprecated)
    assertNull(installProgressMap(InstallStatus.UNKNOWN, 1, 2))
  }

  @Test fun progressUsesNonNegativeNumbers() {
    assertEquals(mapOf("status" to "downloading", "bytes" to 10.0, "total" to 100.0), installProgressMap(InstallStatus.DOWNLOADING, 10, 100))
    assertEquals(mapOf("status" to "pending", "bytes" to 0.0, "total" to 0.0), installProgressMap(InstallStatus.PENDING, -1, -1))
  }

  @Test fun updateTypesAndActivityResults() {
    assertEquals(AppUpdateType.FLEXIBLE, parseUpdateType("flexible"))
    assertEquals(AppUpdateType.IMMEDIATE, parseUpdateType("immediate"))
    assertNull(parseUpdateType("silent"))
    assertEquals(true, updateFlowAccepted(-1))
    assertEquals(false, updateFlowAccepted(0))
    assertNull(updateFlowAccepted(ActivityResult.RESULT_IN_APP_UPDATE_FAILED))
  }
}
