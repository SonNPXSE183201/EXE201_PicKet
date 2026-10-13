import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/receipt_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final duplicates = await gateway.findDuplicateReceipts(
      token,
      FindDuplicateReceiptRequest.fromJson(await request.json()),
    );
    return Response.json(body: {'duplicates': duplicates});
  },
);
