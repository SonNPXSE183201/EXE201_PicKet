import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/profile_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.patch},
  action: (gateway, token, request) async {
    await gateway.updatePreferences(
      token,
      preferencesPatch(await request.json()),
    );
    return Response.json(body: {'updated': true});
  },
);
