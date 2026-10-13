import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/billing_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  maxContentLength: 12000,
  action: (gateway, token, request) async {
    final verificationRequest = VerifyPlayPurchaseRequest.fromJson(
      await request.json(),
    );
    final result = await gateway.verifyPlayPurchase(
      token,
      verificationRequest,
    );
    return Response.json(body: result.toJson());
  },
);
