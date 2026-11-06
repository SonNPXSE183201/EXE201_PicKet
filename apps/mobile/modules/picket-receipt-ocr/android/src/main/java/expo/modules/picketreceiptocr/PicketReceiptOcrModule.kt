package expo.modules.picketreceiptocr

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PicketReceiptOcrModule : Module() {
  private val lock = Any()
  private var session: ReceiptImageSession? = null
  private fun current(id: String): ReceiptImageSession = session?.takeIf { it.id() == id } ?: error("OCR_INVALID_SESSION")
  override fun definition() = ModuleDefinition {
    Name("PicketReceiptOcr")
    AsyncFunction("open") { uri: String -> synchronized(lock) {
      check(session == null || session!!.isClosed) { "OCR_BUSY" }
      val created = ReceiptImageSession(requireNotNull(appContext.reactContext), uri)
      session = created
      created.info()
    }}
    AsyncFunction("select") { id: String, angle: Int -> synchronized(lock) { current(id).select(angle) } }
    AsyncFunction("direction") { id: String, timeout: Int -> synchronized(lock) { current(id).direction(timeout) } }
    AsyncFunction("inspect") { id: String, timeout: Int -> synchronized(lock) { current(id).inspect(timeout) } }
    AsyncFunction("crop") { id: String, x: Int, y: Int, width: Int, height: Int, timeout: Int -> synchronized(lock) { current(id).crop(x, y, width, height, timeout) } }
    AsyncFunction("close") { id: String -> synchronized(lock) { current(id).close() } }
    OnDestroy { Thread { synchronized(lock) { session?.close() } }.apply { isDaemon = true; start() } }
  }
}
