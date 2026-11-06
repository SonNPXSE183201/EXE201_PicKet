import 'dart:convert';
import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:mocktail/mocktail.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:test/test.dart';

class _MockRequestContext extends Mock implements RequestContext {}

class _MockRequest extends Mock implements Request {}

void main() {
  late _MockRequestContext context;
  late _MockRequest request;

  setUp(() {
    context = _MockRequestContext();
    request = _MockRequest();
    when(() => context.request).thenReturn(request);
    when(() => request.headers).thenReturn({});
  });

  test('rejects unsupported methods before contacting upstream', () async {
    when(() => request.method).thenReturn(HttpMethod.delete);
    final response = await handleAuthenticated(
      context,
      methods: {HttpMethod.get},
      action: (_, _, _) async => fail('action must not run'),
    );
    expect(response.statusCode, HttpStatus.methodNotAllowed);
  });

  test('rejects requests without bearer token', () async {
    when(() => request.method).thenReturn(HttpMethod.get);
    final response = await handleAuthenticated(
      context,
      methods: {HttpMethod.get},
      action: (_, _, _) async => fail('action must not run'),
    );
    expect(response.statusCode, HttpStatus.unauthorized);
    expect(jsonDecode(await response.body()), {'error': 'Unauthorized'});
  });

  test('rejects oversized JSON before contacting upstream', () async {
    when(() => request.method).thenReturn(HttpMethod.post);
    when(() => request.headers).thenReturn({
      'authorization': 'Bearer token',
      'content-length': '65537',
    });
    final response = await handleAuthenticated(
      context,
      methods: {HttpMethod.post},
      action: (_, _, _) async => fail('action must not run'),
    );
    expect(response.statusCode, HttpStatus.requestEntityTooLarge);
  });
}
