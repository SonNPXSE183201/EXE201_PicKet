import 'reminder_dates.dart';
import 'dart:io';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../../features/finance/domain/entities/finance_data.dart';

class ReminderService {
  static final instance = ReminderService();
  final plugin = FlutterLocalNotificationsPlugin();
  bool ready = false;
  Future<void> _queue = Future.value();
  Future<void> _enqueue(Future<void> Function() operation) =>
      _queue = _queue.then(
        (_) => operation(),
        onError: (Object _, StackTrace _) => operation(),
      );
  Future<void> initialize() async {
    if (ready || !Platform.isAndroid) return;
    tzdata.initializeTimeZones();
    tz.setLocalLocation(
      tz.getLocation((await FlutterTimezone.getLocalTimezone()).identifier),
    );
    await plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('picket_notification'),
      ),
    );
    ready = true;
  }

  Future<bool> requestPermission() async {
    await initialize();
    return await plugin
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >()
            ?.requestNotificationsPermission() ??
        false;
  }

  Future<void> refresh(FinanceData data) => _enqueue(() => _refresh(data));
  Future<void> _refresh(FinanceData data) async {
    await initialize();
    if (!ready) return;
    await plugin.cancelAllPendingNotifications();
    if (data.preferences['notifications'] != true) return;
    var id = 1;
    for (final date in reminderDates(data, DateTime.now())) {
      final time = tz.TZDateTime(
        tz.local,
        date.year,
        date.month,
        date.day,
        date.hour,
      );
      if (time.isBefore(tz.TZDateTime.now(tz.local))) continue;
      await plugin.zonedSchedule(
        id: id++,
        title: 'Picket · Nhắc việc',
        body: 'Bạn có hoá đơn hoặc hạn món đồ cần xem. Mở Picket để kiểm tra.',
        scheduledDate: time,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'picket_reminders',
            'Nhắc hoá đơn và món đồ',
            channelDescription:
                'Nhắc trước hạn thanh toán, đổi trả và bảo hành',
            importance: Importance.defaultImportance,
            priority: Priority.defaultPriority,
            visibility: NotificationVisibility.private,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      );
    }
  }

  Future<void> cancel() => _enqueue(_cancel);
  Future<void> _cancel() async {
    await initialize();
    if (ready) await plugin.cancelAll();
  }
}
