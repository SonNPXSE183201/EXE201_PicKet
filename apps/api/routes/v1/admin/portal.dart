import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  maxContentLength: 24000,
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final query = request.uri.queryParameters;
      final filters = <String, dynamic>{
        for (final field in [
          'search',
          'status',
          'userId',
          'tier',
          'version',
          'createdFrom',
          'createdTo',
          'sort',
        ])
          if (query[field] != null) field: query[field],
        for (final field in ['page', 'days'])
          if (query[field] != null) field: int.parse(query[field]!),
      };
      return Response.json(
        body: await gateway.adminPortal(
          token,
          query['section'] ?? 'overview',
          filters,
        ),
        headers: {'cache-control': 'no-store'},
      );
    }
    final raw = await readLimitedBody(request, 24000);
    if (raw.length > 24000) return apiError(413, 'Request too large');
    final input = jsonDecode(raw);
    if (input is! Map<String, dynamic> ||
        input['body'] is! Map ||
        input['action'] is! String ||
        input['reason'] is! String ||
        input['requestId'] is! String) {
      throw const FormatException('Invalid administrative mutation.');
    }
    return Response.json(
      body: await gateway.adminMutate(token, input),
      headers: {'cache-control': 'no-store'},
    );
  },
);
