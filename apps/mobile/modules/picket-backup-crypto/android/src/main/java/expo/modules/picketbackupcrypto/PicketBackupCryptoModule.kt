package expo.modules.picketbackupcrypto

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PicketBackupCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PicketBackupCrypto")
    AsyncFunction("deriveBackupKey") { passwordUtf8: String, salt: String ->
      val password = String(Base64.decode(passwordUtf8, Base64.NO_WRAP), Charsets.UTF_8)
      val key = deriveBackupKey(password, Base64.decode(salt, Base64.NO_WRAP))
      try { Base64.encodeToString(key, Base64.NO_WRAP) }
      finally { key.fill(0) }
    }
  }
}
