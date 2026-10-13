import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/admin_action_contract.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.post},
      action: (gateway, token, request) async {
        final targetUser = validateUuid(id);
        final action = AdminUserActionRequest.fromJson(await request.json());
        await gateway.adminUserAction(token, targetUser, action);
        return Response.json(body: {'updated': true});
      },
    );
