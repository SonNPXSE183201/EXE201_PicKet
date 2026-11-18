package expo.modules.picketappupdates

import android.app.PendingIntent
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import java.net.URI
import java.security.MessageDigest
import java.util.zip.ZipFile

@Suppress("DEPRECATION")
class PicketAppUpdatesModule : Module() {
  private val context: Context get() = appContext.reactContext ?: error("Application context unavailable")
  private val signatureFlags: Int get() = if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
  private fun installed() = context.packageManager.getPackageInfo(context.packageName, signatureFlags)
  private fun code(info: PackageInfo) = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
  private fun identity(info: PackageInfo): ApkIdentity {
    val signatures = if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners else info.signatures
    val hashes = signatures?.map { signature -> MessageDigest.getInstance("SHA-256").digest(signature.toByteArray()).joinToString("") { "%02x".format(it) } }?.toSet() ?: emptySet()
    return ApkIdentity(info.packageName, code(info), info.versionName ?: "", hashes)
  }
  private fun fromPlayStore(): Boolean = try {
    val installer = if (Build.VERSION.SDK_INT >= 30) context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
      else context.packageManager.getInstallerPackageName(context.packageName)
    installer == "com.android.vending"
  } catch (_: Exception) { false }
  private fun canInstall() = Build.VERSION.SDK_INT < 26 || context.packageManager.canRequestPackageInstalls()
  private fun verifiedFile(uri: String, bytes: Long, hash: String, expectedCode: Long, expectedVersion: String): File {
    check(!fromPlayStore()) { "Use Google Play for this installation" }
    val parsed = URI(uri)
    require(parsed.scheme == "file" && parsed.rawQuery == null && parsed.rawFragment == null) { "Invalid update URI" }
    val file = File(parsed)
    requireUpdateFile(File(context.cacheDir, "picket-updates"), file)
    require(file.name == "picket-update-$hash.apk" && file.isFile && file.length() == bytes) { "Invalid update file" }
    verifyUpdateStream(file.inputStream(), bytes, hash)
    val archive = context.packageManager.getPackageArchiveInfo(file.absolutePath, signatureFlags) ?: error("Invalid APK")
    require((archive.applicationInfo?.minSdkVersion ?: Int.MAX_VALUE) <= Build.VERSION.SDK_INT) { "Unsupported SDK" }
    val abis = ZipFile(file).use { zip -> zip.entries().asSequence().mapNotNull { entry -> Regex("^lib/([^/]+)/[^/]+\\.so$").matchEntire(entry.name)?.groupValues?.get(1) }.toSet() }
    verifyApkIdentity(identity(installed()), identity(archive), expectedCode, expectedVersion, Build.SUPPORTED_ABIS.toSet(), abis)
    return file
  }
  /** Verification failures keep their own code so JS never falls back to another installer for them. */
  private suspend fun verifiedForInstall(uri: String, bytes: Long, hash: String, expectedCode: Long, version: String): File = try {
    withContext(Dispatchers.IO) { verifiedFile(uri, bytes, hash, expectedCode, version) }
  } catch (error: Exception) {
    throw CodedException("ERR_UPDATE_VERIFICATION", error.message ?: "Update verification failed", error)
  }

  private suspend fun installWithSession(uri: String, bytes: Long, hash: String, expectedCode: Long, version: String): String {
    val file = verifiedForInstall(uri, bytes, hash, expectedCode, version)
    if (!canInstall()) throw CodedException("ERR_INSTALL_PERMISSION", "Install permission required", null)
    val installer = context.packageManager.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
      setAppPackageName(context.packageName)
      setSize(bytes)
      if (Build.VERSION.SDK_INT >= 26) setInstallReason(PackageManager.INSTALL_REASON_USER)
      // Silent only when Picket is already the installer of record; Android asks otherwise.
      if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
    }
    val sessionId = withContext(Dispatchers.IO) {
      // Drop sessions left behind by an earlier attempt (process death, unanswered prompt).
      for (stale in installer.mySessions) try { installer.abandonSession(stale.sessionId) } catch (_: Exception) { /* Already finished. */ }
      try { installer.createSession(params) }
      catch (error: Exception) { throw CodedException("ERR_INSTALL_SESSION", error.message ?: "Unable to create install session", error) }
    }
    val result = InstallSessionResults.await(sessionId)
    try {
      withContext(Dispatchers.IO) {
        installer.openSession(sessionId).use { session ->
          session.openWrite("picket-update.apk", 0, bytes).use { output ->
            // Hash while copying: the session receives exactly the verified bytes.
            try { copyVerifiedUpdate(file.inputStream(), output, bytes, hash) }
            catch (error: IllegalArgumentException) { throw CodedException("ERR_UPDATE_VERIFICATION", error.message, error) }
            session.fsync(output)
          }
          val intent = Intent(context, PicketInstallResultReceiver::class.java).setPackage(context.packageName)
          // PackageInstaller fills in the status extras, so the PendingIntent must be mutable on S+.
          val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
          session.commit(PendingIntent.getBroadcast(context, sessionId, intent, flags).intentSender)
        }
      }
    } catch (error: Exception) {
      InstallSessionResults.forget(sessionId)
      try { installer.abandonSession(sessionId) } catch (_: Exception) { /* Already committed or gone. */ }
      if (error is CodedException) throw error
      throw CodedException("ERR_INSTALL_SESSION", error.message ?: "Unable to write install session", error)
    }
    val status = withTimeoutOrNull(120_000) { result.await() }
      ?: run { InstallSessionResults.forget(sessionId); throw CodedException("ERR_INSTALL_TIMEOUT", "No result from the package installer", null) }
    return when (val outcome = sessionOutcome(status.status)) {
      is SessionOutcome.Resolved -> outcome.value
      is SessionOutcome.Rejected -> throw CodedException(outcome.code, status.message ?: "Install failed", null)
    }
  }

  private fun deviceConditions(): Map<String, Any?> {
    val unmetered = try {
      val connectivity = context.getSystemService(ConnectivityManager::class.java)
      val capabilities = connectivity?.activeNetwork?.let { connectivity.getNetworkCapabilities(it) }
      capabilities != null && (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
        || (Build.VERSION.SDK_INT >= 30 && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_TEMPORARILY_NOT_METERED)))
    } catch (_: Exception) { false }
    val battery = context.getSystemService(BatteryManager::class.java)
    // Sticky system broadcast: a null receiver only reads the last value and registers nothing.
    val batteryFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    val sticky = try {
      if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(null, batteryFilter, Context.RECEIVER_NOT_EXPORTED)
      else context.registerReceiver(null, batteryFilter)
    } catch (_: Exception) { null }
    val capacity = battery?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: Int.MIN_VALUE
    val percent = batteryPercent(capacity, sticky?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1, sticky?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1)
    val plugged = (sticky?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0) != 0
    val charging = (battery?.isCharging ?: false) || plugged
    return mapOf("unmetered" to unmetered, "batteryPercent" to percent, "charging" to charging)
  }

  override fun definition() = ModuleDefinition {
    Name("PicketAppUpdates")
    Function("getInstalledAppInfo") {
      val info = installed()
      mapOf("version" to (info.versionName ?: ""), "versionCode" to code(info), "packageName" to context.packageName,
        "sdk" to Build.VERSION.SDK_INT, "abis" to Build.SUPPORTED_ABIS.toList(), "playStore" to fromPlayStore())
    }
    Function("canInstallUpdates") { canInstall() }
    AsyncFunction("verifyDownloadedApk") Coroutine { uri: String, bytes: Long, hash: String, expectedCode: Long, version: String ->
      withContext(Dispatchers.IO) { verifiedFile(uri, bytes, hash, expectedCode, version); Unit }
    }
    AsyncFunction("openInstallPermissionSettings") Coroutine { ->
      withContext(Dispatchers.Main) {
        val action = if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")) else Intent(Settings.ACTION_SECURITY_SETTINGS)
        context.startActivity(action.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
    AsyncFunction("openInstaller") Coroutine { uri: String, bytes: Long, hash: String, expectedCode: Long, version: String ->
      val file = withContext(Dispatchers.IO) { verifiedFile(uri, bytes, hash, expectedCode, version) }
      withContext(Dispatchers.Main) {
        check(canInstall()) { "Install permission required" }
        val content = FileProvider.getUriForFile(context, "${context.packageName}.picketupdates", file)
        val intent = Intent(Intent.ACTION_VIEW).setDataAndType(content, "application/vnd.android.package-archive")
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        intent.clipData = ClipData.newRawUri("Picket update", content)
        context.startActivity(intent)
      }
    }
    AsyncFunction("installWithSession") Coroutine { uri: String, bytes: Long, hash: String, expectedCode: Long, version: String ->
      installWithSession(uri, bytes, hash, expectedCode, version)
    }
    Function("getDeviceConditions") { deviceConditions() }
  }
}
