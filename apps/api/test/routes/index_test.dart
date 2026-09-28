import 'dart:convert';
import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:mocktail/mocktail.dart';
import 'package:test/test.dart';

import '../../routes/index.dart' as route;

class _MockRequestContext extends Mock implements RequestContext {}

void main() {
  test('GET / describes the API', () async {
    final response = route.onRequest(_MockRequestContext());
    expect(response.statusCode, HttpStatus.ok);
    final body = jsonDecode(await response.body()) as Map<String, dynamic>;
    expect(body['service'], 'picket-api');
    expect(body['documentation'], '/openapi.yaml');
  });
}
