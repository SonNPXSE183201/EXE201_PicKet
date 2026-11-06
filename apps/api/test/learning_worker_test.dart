import 'package:picket_api/src/learning_worker.dart';
import 'package:test/test.dart';

class Gateway implements LearningJobGateway {
  LearningJob? job = const LearningJob('job', 'lease', 'cash-gap-v1', 'vi');
  bool dispatch = true;
  bool dispatchThrows = false;
  bool completionThrows = false;
  final events = <String>[];
  @override
  Future<LearningJob?> claim() async => job;
  @override
  Future<bool> markDispatched(LearningJob job) async {
    events.add('dispatch');
    if (dispatchThrows) throw StateError('uncertain acknowledgement');
    return dispatch;
  }

  @override
  Future<void> complete(LearningJob job, List<String> ids) async {
    events.add('complete');
    if (completionThrows) throw StateError('uncertain completion');
  }

  @override
  Future<void> fail(LearningJob job) async {
    events.add('fail');
  }
}

void main() {
  test(
    'durable dispatch acknowledgement precedes provider and completion',
    () async {
      final gateway = Gateway();
      final worker = LearningWorker(
        gateway: gateway,
        explain: (scenario, locale) async {
          expect(scenario, 'cash-gap-v1');
          expect(locale, 'vi');
          gateway.events.add('provider');
          return ['timing'];
        },
      );
      expect(await worker.runOnce(), true);
      expect(gateway.events, ['dispatch', 'provider', 'complete']);
    },
  );
  for (final uncertain in [false, true]) {
    test(
      'revoked or uncertain dispatch never calls provider: $uncertain',
      () async {
        final gateway = Gateway()
          ..dispatch = false
          ..dispatchThrows = uncertain;
        final worker = LearningWorker(
          gateway: gateway,
          explain: (_, _) async {
            fail('provider must not run');
          },
        );
        await worker.runOnce();
        expect(gateway.events, ['dispatch']);
      },
    );
  }
  test(
    'provider failure is terminal with no retry or fallback provider',
    () async {
      final gateway = Gateway();
      var calls = 0;
      await LearningWorker(
        gateway: gateway,
        explain: (_, _) async {
          calls++;
          throw StateError('provider failed');
        },
      ).runOnce();
      expect(calls, 1);
      expect(gateway.events, ['dispatch', 'fail']);
    },
  );
  test(
    'uncertain completion never retries or overwrites success',
    () async {
      final gateway = Gateway()..completionThrows = true;
      var calls = 0;
      await LearningWorker(
        gateway: gateway,
        explain: (_, _) async {
          calls++;
          return ['buffer'];
        },
      ).runOnce();
      expect(calls, 1);
      expect(gateway.events, ['dispatch', 'complete']);
    },
  );
  test('empty queue does no work', () async {
    final gateway = Gateway()..job = null;
    expect(
      await LearningWorker(
        gateway: gateway,
        explain: (_, _) async => ['timing'],
      ).runOnce(),
      false,
    );
    expect(gateway.events, isEmpty);
  });
  test('invalid claimed input cannot reach provider', () async {
    final gateway = Gateway()
      ..job = const LearningJob('job', 'lease', 'private text', 'vi');
    await LearningWorker(
      gateway: gateway,
      explain: (_, _) async {
        fail('invalid input');
      },
    ).runOnce();
    expect(gateway.events, ['fail']);
  });
  test('unapproved output never completes', () async {
    final gateway = Gateway();
    await LearningWorker(
      gateway: gateway,
      explain: (_, _) async => ['raw model prose'],
    ).runOnce();
    expect(gateway.events, ['dispatch', 'fail']);
  });
}
