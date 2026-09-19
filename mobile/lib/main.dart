import 'dart:async';
import 'features/billing/data/billing_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config/app_config.dart';
import 'core/security/device_lock.dart';
import 'features/auth/data/secure_auth_storage.dart';
import 'features/auth/presentation/auth_gate.dart';
import 'core/theme/picket_theme.dart';
import 'features/finance/presentation/screens/app_shell.dart';
import 'features/finance/presentation/screens/onboarding_screen.dart';
import 'features/finance/presentation/state/finance_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    AppConfig.validate();
    if (AppConfig.configured) {
      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        publishableKey: AppConfig.supabaseKey,
        authOptions: FlutterAuthClientOptions(
          localStorage: SecureAuthStorage(),
        ),
      );
    }
    runApp(
      AppConfig.configured
          ? const AuthGate()
          : const ProviderScope(child: PicketApp(enableDeviceLock: true)),
    );
  } catch (_) {
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Text(
                'Không khởi tạo được ứng dụng. Kiểm tra cấu hình phát hành hoặc khởi động lại.',
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class PicketApp extends ConsumerStatefulWidget {
  const PicketApp({super.key, this.enableDeviceLock = false});
  final bool enableDeviceLock;
  @override
  ConsumerState<PicketApp> createState() => _PicketAppState();
}

class _PicketAppState extends ConsumerState<PicketApp>
    with WidgetsBindingObserver {
  Timer? _syncTimer;
  DateTime? _lastSync, _lastBillingRefresh;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ref.read(financeProvider).load();
    if (ref.read(financeProvider).cloudEnabled) {
      _syncTimer = Timer.periodic(const Duration(minutes: 1), (_) {
        if (WidgetsBinding.instance.lifecycleState ==
            AppLifecycleState.resumed) {
          _refreshCloud();
        }
      });
    }
  }

  void _refreshCloud() {
    final controller = ref.read(financeProvider);
    if (!controller.cloudEnabled ||
        controller.loading ||
        controller.saving ||
        controller.syncing) {
      return;
    }
    final now = DateTime.now();
    if (_lastSync == null || now.difference(_lastSync!).inSeconds >= 30) {
      _lastSync = now;
      unawaited(controller.synchronize());
    }
    if (_lastBillingRefresh == null ||
        now.difference(_lastBillingRefresh!).inMinutes >= 5) {
      final billing = ref.read(billingProvider);
      if (!billing.busy) {
        _lastBillingRefresh = now;
        unawaited(billing.initialize());
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshCloud();
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(financeProvider);
    if (controller.cloudEnabled) ref.watch(billingProvider);
    return MaterialApp(
      title: 'Picket',
      debugShowCheckedModeBanner: false,
      theme: picketTheme(),
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      builder: (context, child) =>
          widget.enableDeviceLock ? DeviceLock(child: child!) : child!,
      home: ListenableBuilder(
        listenable: controller,
        builder: (context, _) {
          if (controller.loading) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          if (controller.loadError != null) {
            return Scaffold(
              body: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.cloud_off_outlined, size: 48),
                      const SizedBox(height: 24),
                      Text(controller.loadError!, textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: controller.load,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }
          return controller.data.onboarded
              ? AppShell(controller: controller)
              : OnboardingScreen(controller: controller);
        },
      ),
    );
  }
}
