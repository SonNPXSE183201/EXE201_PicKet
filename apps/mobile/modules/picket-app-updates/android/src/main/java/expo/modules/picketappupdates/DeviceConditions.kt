package expo.modules.picketappupdates

/**
 * Battery percentage from BatteryManager.BATTERY_PROPERTY_CAPACITY, falling back to the
 * ACTION_BATTERY_CHANGED level/scale. Unknown readings report 100 so they never block a download.
 */
fun batteryPercent(capacity: Int, level: Int, scale: Int): Int = when {
  capacity in 0..100 -> capacity
  level >= 0 && scale > 0 -> (level * 100 / scale).coerceIn(0, 100)
  else -> 100
}
