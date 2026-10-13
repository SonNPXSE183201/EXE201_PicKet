import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get},
  action: (gateway, token, request) async {
    final rawPage = request.uri.queryParameters['page'] ?? '0';
    final page = int.tryParse(rawPage);
    if (page == null || page < 0 || page > 100000) {
      return apiError(400, 'Invalid page');
    }
    final overview = await gateway.adminOverview(token, page);
    return Response.json(body: overview.toJson());
  },
);
