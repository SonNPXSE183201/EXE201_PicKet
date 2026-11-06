package expo.modules.picketappupdates

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
  }
}
