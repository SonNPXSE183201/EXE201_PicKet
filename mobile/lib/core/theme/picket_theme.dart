import 'package:flutter/material.dart';

abstract final class PicketColors {
  static const cream = Color(0xFFFFF8F0);
  static const peach = Color(0xFFFFD6BA);
  static const coral = Color(0xFFFFB4A2);
  static const mauve = Color(0xFF96606D);
  static const ink = Color(0xFF4A2C2A);
  static const muted = Color(0xFF806268);
  static const expense = Color(0xFFBD3152);
  static const income = Color(0xFF147D62);
}

ThemeData picketTheme() {
  final scheme =
      ColorScheme.fromSeed(
        seedColor: PicketColors.mauve,
        surface: PicketColors.cream,
      ).copyWith(
        primary: PicketColors.mauve,
        onSurface: PicketColors.ink,
        secondaryContainer: PicketColors.peach,
      );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: PicketColors.cream,
    appBarTheme: const AppBarTheme(
      backgroundColor: PicketColors.cream,
      foregroundColor: PicketColors.ink,
      centerTitle: false,
      scrolledUnderElevation: 0,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.all(18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: PicketColors.peach),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: PicketColors.peach),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: PicketColors.peach,
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
