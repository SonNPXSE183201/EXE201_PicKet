import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:mocktail/mocktail.dart';
import 'package:test/test.dart';

import '../routes/v1/releases/policy.dart' as route;

class _MockRequestContext extends Mock implements RequestContext {}

class _MockRequest extends Mock implements Request {}

Future<int> _status(String url, {HttpMethod method = HttpMethod.get}) async {
  final request = _MockRequest();
  when(() => request.method).thenReturn(method);
  when(() => request.uri).thenReturn(Uri.parse(url));
  final context = _MockRequestContext();
  when(() => context.request).thenReturn(request);
  return (await route.onRequest(context)).statusCode;
}

void main() {
  const base = 'http://localhost/v1/releases/policy';

  test('only GET is allowed', () async {
    expect(
      await _status('$base?channel=play', method: HttpMethod.post),
      HttpStatus.methodNotAllowed,
    );
  });

  test('channel must be exactly play or apk', () async {
    for (final query in [
      '',
      '?channel=',
      '?channel=Play',
      '?channel=play_production',
      '?channel=landing',
      '?channel=play,apk',
    ]) {
      expect(
        await _status('$base$query'),
        HttpStatus.badRequest,
        reason: query,
      );
    }
  });

  test('versionCode must be a positive integer when present', () async {
    for (final code in ['0', '-1', 'abc', '1.5', '99999999999', '2100000001']) {
      expect(
        await _status('$base?channel=apk&versionCode=$code'),
        HttpStatus.badRequest,
        reason: code,
      );
    }
  });
}
