package __PACKAGE__

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.util.Log
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.lang.ref.WeakReference
import java.util.WeakHashMap
import okhttp3.Call
import okhttp3.Connection
import okhttp3.ConnectionPool
import okhttp3.EventListener

/** Process-lifetime guard for the actual RN and Expo client pools, not a
 * separate provider singleton. No cancellation, request replay or auth state. */
object PicketNetworkGuard {
  private val lock = Any()
  private var installed = false
  private var generation = 0L
  private var currentNetwork: Network? = null
  private var validatedNetwork: Network? = null
  private val pools = mutableListOf<WeakReference<ConnectionPool>>()
  private val connectionGenerations = WeakHashMap<Connection, Long>()

  private fun evictIdle() {
    val live = synchronized(lock) {
      pools.removeAll { it.get() == null }
      pools.mapNotNull { it.get() }
    }
    // Never evict under our state lock or cancel active calls. A last release
    // of an old active HTTP/2 connection also runs this idle-only sweep below.
    live.forEach { it.evictAll() }
  }

  fun install(context: Context) {
    val application = context.applicationContext
    val manager = application.getSystemService(ConnectivityManager::class.java) ?: return
    synchronized(lock) {
      if (installed) return
      installed = true
    }
    // Sole application-level custom factory. The context builder preserves RN
    // cookies, cache, proxy, TLS verification and standard timeout defaults.
    OkHttpClientProvider.setOkHttpClientFactory(OkHttpClientFactory {
      lateinit var pool: ConnectionPool
      val client = OkHttpClientProvider.createClientBuilder(application)
        .eventListenerFactory {
          object : EventListener() {
            override fun connectionAcquired(call: Call, connection: Connection) {
              synchronized(lock) {
                if (!connectionGenerations.containsKey(connection)) connectionGenerations[connection] = generation
              }
            }
            override fun connectionReleased(call: Call, connection: Connection) {
              val stale = synchronized(lock) { (connectionGenerations[connection] ?: generation) != generation }
              if (stale) pool.evictAll()
            }
          }
        }.build()
      pool = client.connectionPool
      synchronized(lock) {
        pools.removeAll { it.get() == null }
        pools.add(WeakReference(pool))
      }
      client
    })
    try {
      manager.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          val changed = synchronized(lock) {
            if (currentNetwork == network) false else {
              currentNetwork = network; validatedNetwork = null; generation++; true
            }
          }
          if (changed) evictIdle()
        }
        override fun onLost(network: Network) {
          val changed = synchronized(lock) {
            if (currentNetwork != network) false else {
              currentNetwork = null; validatedNetwork = null; generation++; true
            }
          }
          if (changed) evictIdle()
        }
        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
          val changed = synchronized(lock) {
            if (currentNetwork != network || validatedNetwork == network || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) false
            else { validatedNetwork = network; generation++; true }
          }
          if (changed) evictIdle()
        }
      })
    } catch (_: RuntimeException) {
      // Ordinary networking still works if Android cannot register a callback.
      // Never expose connectivity diagnostics or credentials in the UI.
      Log.w("PicketNetworkGuard", "Network-change monitoring unavailable")
    }
  }
}
