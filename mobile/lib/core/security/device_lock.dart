import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

class DeviceLock extends StatefulWidget {
  const DeviceLock({super.key, required this.child});
  final Widget child;
  static const storageKey = 'picket.device_lock';
  @override
  State<DeviceLock> createState() => _DeviceLockState();
}

class _DeviceLockState extends State<DeviceLock> with WidgetsBindingObserver {
  bool locked = true, enabled = false, busy = false;
  String? error;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> load() async {
    try {
      enabled =
          await const FlutterSecureStorage().read(key: DeviceLock.storageKey) ==
          'true';
      if (mounted) setState(() => locked = enabled);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Không đọc được cài đặt bảo vệ. Hãy khởi động lại ứng dụng.',
        );
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused && !busy) {
      if (enabled) setState(() => locked = true);
    }
    if (state == AppLifecycleState.resumed && !busy) load();
  }

  Future<void> unlock() async {
    setState(() => busy = true);
    try {
      final ok = await LocalAuthentication().authenticate(
        localizedReason: 'Mở kho dữ liệu Picket',
        persistAcrossBackgrounding: true,
      );
      if (mounted) setState(() => locked = !ok);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Không xác thực được. Sử dụng mã khoá màn hình hoặc thử lại.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      Offstage(offstage: locked, child: widget.child),
      if (locked)
        Positioned.fill(
          child: Material(
            child: SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.lock_outline, size: 48),
                      const SizedBox(height: 20),
                      Text(
                        error ?? 'Mở khoá để tiếp tục',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: busy ? null : unlock,
                        child: const Text('Xác thực thiết bị'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
    ],
  );
}
