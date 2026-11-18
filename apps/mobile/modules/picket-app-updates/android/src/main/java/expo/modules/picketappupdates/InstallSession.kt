package expo.modules.picketappupdates

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import kotlinx.coroutines.CompletableDeferred
import java.util.concurrent.ConcurrentHashMap

/** Outcome of a PackageInstaller status broadcast, as seen by JS (`ApkInstallOutcome`) or a reject code. */
sealed class SessionOutcome {
  data class Resolved(val value: String) : SessionOutcome()
  data class Rejected(val code: String) : SessionOutcome()
}

fun sessionOutcome(status: Int): SessionOutcome = when (status) {
  PackageInstaller.STATUS_SUCCESS -> SessionOutcome.Resolved("started")
  PackageInstaller.STATUS_PENDING_USER_ACTION -> SessionOutcome.Resolved("pending-user-action")
  PackageInstaller.STATUS_FAILURE_ABORTED -> SessionOutcome.Rejected("ERR_INSTALL_ABORTED")
  PackageInstaller.STATUS_FAILURE_BLOCKED -> SessionOutcome.Rejected("ERR_INSTALL_BLOCKED")
  PackageInstaller.STATUS_FAILURE_CONFLICT -> SessionOutcome.Rejected("ERR_INSTALL_CONFLICT")
  PackageInstaller.STATUS_FAILURE_INCOMPATIBLE -> SessionOutcome.Rejected("ERR_INSTALL_INCOMPATIBLE")
  PackageInstaller.STATUS_FAILURE_INVALID -> SessionOutcome.Rejected("ERR_INSTALL_INVALID")
  PackageInstaller.STATUS_FAILURE_STORAGE -> SessionOutcome.Rejected("ERR_INSTALL_STORAGE")
  else -> SessionOutcome.Rejected("ERR_INSTALL_FAILED")
}

data class SessionResult(val status: Int, val message: String?)

/** Hands status broadcasts from [PicketInstallResultReceiver] back to the awaiting module call. */
object InstallSessionResults {
  private val waiters = ConcurrentHashMap<Int, CompletableDeferred<SessionResult>>()

  fun await(sessionId: Int): CompletableDeferred<SessionResult> =
    CompletableDeferred<SessionResult>().also { waiters[sessionId] = it }

  fun forget(sessionId: Int) {
    waiters.remove(sessionId)
  }

  fun deliver(sessionId: Int, result: SessionResult) {
    waiters.remove(sessionId)?.complete(result)
  }
}

/** Not exported; only reachable through the PendingIntent given to PackageInstaller.Session.commit(). */
class PicketInstallResultReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
    val sessionId = intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1)
    if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
      val confirm = confirmIntent(intent)
      try {
        // System confirmation UI from PackageInstaller; works while Picket is in the foreground.
        confirm?.let { context.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
      } catch (_: Exception) {
        // Background activity start was blocked; JS still gets "pending-user-action".
      }
    }
    InstallSessionResults.deliver(sessionId, SessionResult(status, intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)))
  }

  @Suppress("DEPRECATION")
  private fun confirmIntent(intent: Intent): Intent? =
    if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
    else intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
}
