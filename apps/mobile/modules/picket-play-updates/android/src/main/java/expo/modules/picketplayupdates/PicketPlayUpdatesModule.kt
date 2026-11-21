package expo.modules.picketplayupdates

import android.content.Context
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallException
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.ktx.requestAppUpdateInfo
import com.google.android.play.core.ktx.requestCompleteUpdate
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val INSTALL_STATE_EVENT = "onInstallState"
// Arbitrary but unique within the app; Expo forwards every activity result to every module.
private const val UPDATE_REQUEST_CODE = 0x5049

/**
 * Google Play In-App Updates. Only linked into Play builds (PICKET_PLAY_BUILD=1);
 * the direct APK build excludes this module from autolinking.
 */
class PicketPlayUpdatesModule : Module() {
  private val context: Context get() = appContext.reactContext ?: error("Application context unavailable")
  private var manager: AppUpdateManager? = null
  private var pendingFlow: CompletableDeferred<Int>? = null
  private var listening = false

  private val installListener = InstallStateUpdatedListener { state ->
    installProgressMap(state.installStatus(), state.bytesDownloaded(), state.totalBytesToDownload())?.let { sendEvent(INSTALL_STATE_EVENT, it) }
  }

  private fun updateManager(): AppUpdateManager = manager ?: AppUpdateManagerFactory.create(context).also { manager = it }

  /** null when Play is missing, outdated, or the app was not installed from Play. */
  private suspend fun freshInfo(): AppUpdateInfo? = try {
    updateManager().requestAppUpdateInfo()
  } catch (_: InstallException) {
    null
  }

  private fun snapshot(info: AppUpdateInfo) = PlayUpdateSnapshot(
    updateAvailability = info.updateAvailability(),
    installStatus = info.installStatus(),
    availableVersionCode = info.availableVersionCode(),
    priority = info.updatePriority(),
    stalenessDays = info.clientVersionStalenessDays(),
    flexibleAllowed = info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
    immediateAllowed = info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
  )

  private suspend fun startUpdate(type: String): Boolean {
    val updateType = parseUpdateType(type) ?: throw CodedException("ERR_PLAY_UPDATE_TYPE", "Unknown update type: $type", null)
    // An AppUpdateInfo can start only one flow, so always request a fresh one.
    val info = freshInfo() ?: return false
    val flow = withContext(Dispatchers.Main) {
      val activity = appContext.currentActivity ?: throw CodedException("ERR_PLAY_UPDATE_ACTIVITY", "No foreground activity", null)
      // Never leave an earlier caller hanging.
      pendingFlow?.complete(RESULT_CANCELED_CODE)
      val deferred = CompletableDeferred<Int>()
      pendingFlow = deferred
      val started = try {
        updateManager().startUpdateFlowForResult(info, activity, AppUpdateOptions.defaultOptions(updateType), UPDATE_REQUEST_CODE)
      } catch (error: Exception) {
        pendingFlow = null
        throw CodedException("ERR_PLAY_UPDATE_START", error.message ?: "Unable to start the Play update flow", error)
      }
      if (!started) {
        pendingFlow = null
        null
      } else deferred
    } ?: return false
    val resultCode = flow.await()
    return updateFlowAccepted(resultCode)
      ?: throw CodedException("ERR_PLAY_UPDATE_FAILED", "Google Play could not complete the update flow", null)
  }

  private fun startListening() {
    if (listening) return
    updateManager().registerListener(installListener)
    listening = true
  }

  private fun stopListening() {
    if (!listening) return
    manager?.unregisterListener(installListener)
    listening = false
  }

  override fun definition() = ModuleDefinition {
    Name("PicketPlayUpdates")
    Events(INSTALL_STATE_EVENT)

    AsyncFunction("checkForUpdate") Coroutine { ->
      freshInfo()?.let { playUpdateInfoMap(snapshot(it)) }
    }

    AsyncFunction("startUpdate") Coroutine { type: String -> startUpdate(type) }

    AsyncFunction("completeUpdate") Coroutine { ->
      try {
        updateManager().requestCompleteUpdate()
      } catch (error: InstallException) {
        throw CodedException("ERR_PLAY_UPDATE_COMPLETE", error.message ?: "Unable to complete the update", error)
      }
    }

    OnStartObserving(INSTALL_STATE_EVENT) { startListening() }
    OnStopObserving(INSTALL_STATE_EVENT) { stopListening() }

    OnActivityResult { _, payload ->
      if (payload.requestCode != UPDATE_REQUEST_CODE) return@OnActivityResult
      pendingFlow?.complete(payload.resultCode)
      pendingFlow = null
    }

    OnDestroy {
      stopListening()
      pendingFlow?.complete(RESULT_CANCELED_CODE)
      pendingFlow = null
    }
  }
}

private const val RESULT_CANCELED_CODE = 0 // android.app.Activity.RESULT_CANCELED
