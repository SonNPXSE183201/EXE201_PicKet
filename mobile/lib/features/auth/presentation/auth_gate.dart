import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/security/device_cipher.dart';
import '../../../core/theme/picket_theme.dart';
import '../../../main.dart';
import '../../finance/data/repositories_impl/cloud_finance_repository.dart';
import '../../finance/domain/usecases/finance_actions.dart';
import '../../finance/presentation/state/finance_controller.dart';
import 'auth_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  StreamSubscription<AuthState>? _subscription;
  bool _recovering = false;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _userId = Supabase.instance.client.auth.currentUser?.id;
    _subscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      state,
    ) {
      if (!mounted) return;
      setState(() {
        _userId = state.session?.user.id;
        if (state.event == AuthChangeEvent.passwordRecovery) {
          _recovering = true;
        } else if (state.event == AuthChangeEvent.signedOut ||
            state.session == null) {
          _recovering = false;
        }
      });
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_userId == null || _recovering) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: picketTheme(),
        home: AuthScreen(
          recovery: _recovering,
          onRecovered: () => setState(() => _recovering = false),
        ),
      );
    }
    final id = _userId!;
    return ProviderScope(
      key: ValueKey(id),
      overrides: [
        financeProvider.overrideWith((ref) {
          final repository = CloudFinanceRepository(
            cipher: DeviceCipher(id),
            scope: id,
            client: Supabase.instance.client,
          );
          final controller = FinanceController(FinanceActions(repository));
          ref.onDispose(() {
            controller.dispose();
            repository.close();
          });
          return controller;
        }),
      ],
      child: const PicketApp(enableDeviceLock: true),
    );
  }
}
