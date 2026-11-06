import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/account_control_contract.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.delete},
  action: (gateway, token, request) async {
    DeleteAccountRequest.fromJson(await request.json());
    await gateway.deleteAccount(token);
    return Response.json(body: {'deleted': true});
  },
);
