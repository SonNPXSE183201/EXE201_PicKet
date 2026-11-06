import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test(
    'bounded body rejects a chunked request before buffering all data',
    () async {
      final request = Request.post(
        Uri.parse('http://localhost/'),
        body: Stream<List<int>>.fromIterable([
          [1, 2, 3],
          [4, 5, 6],
        ]),
      );
      await expectLater(
        readLimitedBody(request, 5),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 413),
        ),
      );
    },
  );
  test('bounded body decodes UTF8 by byte count', () async {
    final value = utf8.encode('hỗ trợ');
    final request = Request.post(
      Uri.parse('http://localhost/'),
      body: Stream<List<int>>.fromIterable([
        value.sublist(0, 3),
        value.sublist(3),
      ]),
    );
    expect(await readLimitedBody(request, value.length), 'hỗ trợ');
  });
}
