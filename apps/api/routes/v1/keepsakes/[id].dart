import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final itemId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final item = await gateway.updateKeepsake(
            token,
            itemId,
            await request.json(),
          );
          return Response.json(body: {'keepsake': item.toJson()});
        }
        final version = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (version == null || version < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final item = await gateway.archiveKeepsake(token, itemId, version);
        return Response.json(body: {'keepsake': item.toJson()});
      },
    );
