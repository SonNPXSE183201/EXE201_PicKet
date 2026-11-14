# Picket R8 rules (copied into android/app/proguard-rules.pro by plugins/with-release-shrinking.js).
# Libraries that ship consumer rules (React Native, Expo modules core, expo-notifications,
# Reanimated/Worklets, Play Billing, ML Kit, OkHttp) are not repeated here.
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }

# Local Expo modules (modules/picket-*): records and native callbacks are looked up by name.
-keep class expo.modules.picketappupdates.** { *; }
-keep class expo.modules.picketbackupcrypto.** { *; }
-keep class expo.modules.picketreceiptocr.** { *; }

# On-device OCR (rn-mlkit-ocr ships no consumer rules).
-keep class com.rnmlkitocr.** { *; }
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**

# Google Play Billing through expo-iap / OpenIAP (model classes parsed by reflection).
-keep class expo.modules.iap.** { *; }
-keep class dev.hyo.openiap.** { *; }

-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
