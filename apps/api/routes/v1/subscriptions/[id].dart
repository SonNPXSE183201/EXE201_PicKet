import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';
import 'package:picket_api/src/subscription_contract.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final resourceId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final item = await gateway.updateSubscription(
            token,
            resourceId,
            UpdateSubscriptionRequest.fromJson(await request.json()),
          );
          return Response.json(body: {'subscription': item.toJson()});
        }
        final version = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (version == null || version < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final item = await gateway.archiveSubscription(
          token,
          resourceId,
          version,
        );
        return Response.json(body: {'subscription': item.toJson()});
      },
    );
