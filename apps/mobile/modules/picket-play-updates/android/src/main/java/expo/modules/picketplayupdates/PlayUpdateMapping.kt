package expo.modules.picketplayupdates

import com.google.android.play.core.install.model.ActivityResult
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/** Plain values read from AppUpdateInfo, so the mapping can be unit-tested without Play Services. */
data class PlayUpdateSnapshot(
  val updateAvailability: Int,
  val installStatus: Int,
  val availableVersionCode: Int,
  val priority: Int,
  val stalenessDays: Int?,
  val flexibleAllowed: Boolean,
  val immediateAllowed: Boolean,
)

/** Mirrors `PlayUpdateInfo` in src/features/updates/update-types.ts. */
fun playUpdateInfoMap(snapshot: PlayUpdateSnapshot): Map<String, Any?> {
  val inProgress = snapshot.updateAvailability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
  val available = inProgress || snapshot.updateAvailability == UpdateAvailability.UPDATE_AVAILABLE
  return mapOf(
    "available" to available,
    "availableVersionCode" to snapshot.availableVersionCode,
    "priority" to snapshot.priority.coerceIn(0, 5),
    "stalenessDays" to snapshot.stalenessDays,
    "flexibleAllowed" to snapshot.flexibleAllowed,
    "immediateAllowed" to snapshot.immediateAllowed,
    "downloaded" to (snapshot.installStatus == InstallStatus.DOWNLOADED),
    "inProgress" to inProgress,
  )
}

/** Maps an InstallStatus to the `InstallProgress["status"]` union; null for states JS should not see. */
fun installStatusName(status: Int): String? = when (status) {
  InstallStatus.PENDING -> "pending"
  InstallStatus.DOWNLOADING -> "downloading"
  InstallStatus.DOWNLOADED -> "downloaded"
  InstallStatus.INSTALLING -> "installing"
  InstallStatus.INSTALLED -> "installed"
  InstallStatus.FAILED -> "failed"
  InstallStatus.CANCELED -> "canceled"
  else -> null
}

/** Mirrors `InstallProgress` in update-types.ts; bytes are sent as doubles (JS numbers). */
fun installProgressMap(status: Int, bytes: Long, total: Long): Map<String, Any?>? {
  val name = installStatusName(status) ?: return null
  return mapOf("status" to name, "bytes" to bytes.coerceAtLeast(0).toDouble(), "total" to total.coerceAtLeast(0).toDouble())
}

fun parseUpdateType(type: String): Int? = when (type) {
  "flexible" -> AppUpdateType.FLEXIBLE
  "immediate" -> AppUpdateType.IMMEDIATE
  else -> null
}

private const val ACTIVITY_RESULT_OK = -1 // android.app.Activity.RESULT_OK

/** true = user accepted, false = cancelled, null = the Play flow failed. */
fun updateFlowAccepted(resultCode: Int): Boolean? = when (resultCode) {
  ACTIVITY_RESULT_OK -> true
  ActivityResult.RESULT_IN_APP_UPDATE_FAILED -> null
  else -> false
}
